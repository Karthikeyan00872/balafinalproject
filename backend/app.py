import os
from datetime import datetime, timezone
from uuid import uuid4

from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
DATABASE_NAME = os.getenv('DATABASE_NAME', 'tn_oap_portal')

app = Flask(__name__)
CORS(app)

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
db = client[DATABASE_NAME]
applications = db.applications

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


@app.get('/api/health')
def health_check():
    return jsonify({'status': 'ok', 'database': DATABASE_NAME})


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

    if age < 60:
        return jsonify({'error': 'Applicant must be at least 60 years old.'}), 400

    reference_number = f'TNOAP-{datetime.now(timezone.utc).strftime("%Y%m%d")}-{uuid4().hex[:8].upper()}'
    application = {
        'referenceNumber': reference_number,
        'applicantName': data['applicantName'].strip(),
        'mobile': data['mobile'].strip(),
        'age': age,
        'canNumber': data.get('canNumber', '').strip(),
        'district': data['district'].strip(),
        'taluk': data['taluk'].strip(),
        'bankName': data['bankName'].strip(),
        'ifsc': data['ifsc'].strip().upper(),
        'address': data['address'].strip(),
        'documentsReady': bool(data.get('documentsReady')),
        'status': 'Draft saved - submit on official TN e-Sevai portal',
        'createdAt': datetime.now(timezone.utc),
    }
    try:
        applications.insert_one(application)
    except Exception as exc:
        return jsonify({'error': 'Database unavailable. Please check MongoDB connection.', 'details': str(exc)}), 503

    return jsonify({
        'message': 'Application saved successfully.',
        'referenceNumber': reference_number,
        'status': application['status'],
    }), 201


@app.get('/api/applications/<reference_number>')
def get_application(reference_number):
    application = applications.find_one({'referenceNumber': reference_number}, {'_id': 0})
    if not application:
        return jsonify({'error': 'Application not found.'}), 404
    return jsonify(application)


if __name__ == '__main__':
    app.run(debug=True)
