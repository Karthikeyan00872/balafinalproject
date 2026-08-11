import json
import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from uuid import uuid4

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
DATABASE_NAME = os.getenv('DATABASE_NAME', 'tnuwwb_portal')
STORAGE_FILE = Path(os.getenv('STORAGE_FILE', Path(__file__).with_name('applications.json')))
FRONTEND_DIR = Path(__file__).resolve().parent.parent / 'frontend'

app = Flask(__name__, static_folder=None)
CORS(app)

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=1000)
db = client[DATABASE_NAME]
applications = db.applications
file_lock = Lock()

REQUIRED_FIELDS = [
    'applicantName',
    'mobile',
    'age',
    'district',
    'taluk',
    'bankName',
    'ifsc',
    'address',
]


def mongo_available():
    try:
        client.admin.command('ping')
        return True
    except ServerSelectionTimeoutError:
        return False
    except PyMongoError:
        return False


def serialize_application(application):
    serialized = dict(application)
    serialized.pop('_id', None)
    created_at = serialized.get('createdAt')
    if isinstance(created_at, datetime):
        serialized['createdAt'] = created_at.isoformat()
    return serialized


def read_file_records():
    if not STORAGE_FILE.exists():
        return []
    with STORAGE_FILE.open('r', encoding='utf-8') as file:
        return json.load(file)


def write_file_records(records):
    STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with STORAGE_FILE.open('w', encoding='utf-8') as file:
        json.dump(records, file, indent=2)


def save_application(application):
    if mongo_available():
        applications.insert_one(application)
        return 'mongodb'

    record = serialize_application(application)
    with file_lock:
        records = read_file_records()
        records.append(record)
        write_file_records(records)
    return 'file'


def find_application(reference_number):
    if mongo_available():
        application = applications.find_one({'referenceNumber': reference_number}, {'_id': 0})
        return serialize_application(application) if application else None

    with file_lock:
        return next(
            (record for record in read_file_records() if record.get('referenceNumber') == reference_number),
            None,
        )


@app.get('/')
def root():
    return send_from_directory(FRONTEND_DIR, 'index.html')


@app.get('/<path:filename>')
def frontend_assets(filename):
    return send_from_directory(FRONTEND_DIR, filename)


@app.get('/api/health')
def health_check():
    storage = 'mongodb' if mongo_available() else 'file'
    return jsonify({'status': 'ok', 'database': DATABASE_NAME, 'storage': storage})


@app.post('/api/applications')
def create_application():
    data = request.get_json(silent=True) or {}
    missing = [field for field in REQUIRED_FIELDS if not str(data.get(field, '')).strip()]
    if missing:
        return jsonify({'error': f'Missing required fields: {", ".join(missing)}'}), 400

    try:
        age = int(data['age'])
    except (TypeError, ValueError):
        return jsonify({'error': 'Age must be a valid number.'}), 400

    if age < 18 or age > 60:
        return jsonify({'error': 'Worker must be between 18 and 60 years old.'}), 400

    reference_number = f'TNUWWB-{datetime.now(timezone.utc).strftime("%Y%m%d")}-{uuid4().hex[:8].upper()}'
    application = {
        'referenceNumber': reference_number,
        'applicantName': data['applicantName'].strip(),
        'mobile': data['mobile'].strip(),
        'age': age,
        'welfareBoard': data.get('canNumber', '').strip(),
        'district': data['district'].strip(),
        'taluk': data['taluk'].strip(),
        'bankName': data['bankName'].strip(),
        'ifsc': data['ifsc'].strip().upper(),
        'address': data['address'].strip(),
        'documentsReady': bool(data.get('documentsReady')),
        'status': 'Draft saved - upload documents and submit for welfare board verification',
        'createdAt': datetime.now(timezone.utc),
    }

    try:
        storage = save_application(application)
    except (OSError, PyMongoError) as exc:
        return jsonify({'error': 'Unable to save application.', 'details': str(exc)}), 503

    return jsonify({
        'message': 'Application saved successfully.',
        'referenceNumber': reference_number,
        'status': application['status'],
        'storage': storage,
    }), 201


@app.get('/api/applications/<reference_number>')
def get_application(reference_number):
    try:
        application = find_application(reference_number)
    except (OSError, PyMongoError) as exc:
        return jsonify({'error': 'Unable to retrieve application.', 'details': str(exc)}), 503

    if not application:
        return jsonify({'error': 'Application not found.'}), 404
    return jsonify(application)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
