# Tamil Nadu Old Age Pension Application Helper

A simple full-stack project that explains the Tamil Nadu Old Age Pension online application process and saves applicant draft records.

## Project structure

- `frontend/` - HTML, CSS, and JavaScript user interface.
- `backend/` - Python Flask API.
- MongoDB - stores application draft records in the `tn_oap_portal` database.

## Features

- Step-by-step TN e-Sevai guidance for CAN registration, REV-201 application entry, document upload, submission, and verification.
- Required document checklist.
- Applicant draft form with validation.
- Flask API endpoints for health checks, saving application records, and looking up records by reference number.

## Run locally

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export MONGO_URI="mongodb://localhost:27017/"
python app.py
```

The backend runs at `http://localhost:5000`.

### Frontend

Open `frontend/index.html` in a browser, or serve it with:

```bash
cd frontend
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## API endpoints

- `GET /api/health` - Confirms the API is running.
- `POST /api/applications` - Saves an application draft.
- `GET /api/applications/<referenceNumber>` - Retrieves a saved application draft.

> This project is an informational helper. Final government submission must be completed through the official Tamil Nadu e-Sevai portal.
