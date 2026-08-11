# TNUWWB Digital Welfare Platform Blueprint

This repository contains an MVP blueprint and starter web application for a digital Web and Mobile Platform modeled after the Tamil Nadu Unorganised Workers Welfare Board (TNUWWB) portal. The platform supports worker registration, document upload, field verification, welfare-scheme claims, and QR-enabled smart-card issuance.

## 1. High-Level System Architecture & Technology Stack

### Recommended MVP stack

| Layer | Recommendation | Rationale |
| --- | --- | --- |
| Web frontend | React with Vite, TypeScript, Tailwind CSS | Fast development, reusable components, strong form ecosystem, and easy integration with dashboards. |
| Mobile app | Flutter | One codebase for Android and iOS, strong offline-first support for field officers, camera/document upload support. |
| Backend API | Node.js with NestJS or Express | Mature REST API ecosystem, OTP integrations, PDF generation, queue workers, and role-based middleware. |
| Database | PostgreSQL | Strong relational integrity for registration, verification, claims, audit logs, and reporting. |
| File storage | S3-compatible object storage or local MinIO for MVP | Secure document storage with signed URLs and scalable migration path. |
| Authentication | JWT access tokens plus refresh tokens; OTP-based worker login | Matches mobile-first citizen workflow while supporting staff/admin role sessions. |
| Background jobs | BullMQ with Redis | PDF smart-card generation, SMS notifications, claim reminders, and document processing. |
| PDF/QR | PDFKit or Puppeteer plus QRCode library | Generates downloadable smart cards with verifiable QR payloads. |
| Deployment | Docker Compose for MVP; cloud VM or managed Kubernetes later | Easy demo deployment and predictable local development. |

### Core modules

1. **Citizen/Worker Portal**: mobile OTP login, board/occupation selection, registration form, document upload, claim submission, and status tracking.
2. **Verifier Dashboard**: Assistant Commissioner/VAO/RI queue management, document inspection, eligibility decision, rejection reasons, and field-verification notes.
3. **Admin Console**: welfare board, occupation, scheme, user, SLA, document-type, and reporting configuration.
4. **Smart Card Service**: worker ID generation, registration expiry calculation, PDF rendering, QR-code generation, and verification endpoint.
5. **Notification Service**: OTP, acknowledgement, approval/rejection, field-verification, claim-status, and smart-card messages through SMS/email/push.
6. **Audit & Compliance Layer**: immutable action logs for every registration, claim, document review, and admin configuration change.

### Status flow

```text
Draft -> OTP Verified -> Pending Verification -> Field Verification -> Approved / Rejected -> Smart Card Issued
```

Claim flow:

```text
Claim Draft -> Submitted -> Under Review -> Approved / Rejected -> Paid / Closed
```

## 2. Relational Database Schema

The schema below is PostgreSQL-oriented and can be adapted to MySQL by replacing enum and timestamp syntax.

```sql
CREATE TYPE user_role AS ENUM ('WORKER', 'VAO', 'RI', 'ASSISTANT_COMMISSIONER', 'ADMIN');
CREATE TYPE registration_status AS ENUM ('DRAFT', 'OTP_VERIFIED', 'PENDING_VERIFICATION', 'FIELD_VERIFICATION', 'APPROVED', 'REJECTED', 'SMART_CARD_ISSUED');
CREATE TYPE claim_status AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID', 'CLOSED');
CREATE TYPE document_owner_type AS ENUM ('REGISTRATION', 'CLAIM');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile VARCHAR(10) UNIQUE NOT NULL,
  email VARCHAR(255),
  password_hash TEXT,
  role user_role NOT NULL DEFAULT 'WORKER',
  full_name VARCHAR(150) NOT NULL,
  district VARCHAR(100),
  taluk VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile VARCHAR(10) NOT NULL,
  otp_hash TEXT NOT NULL,
  purpose VARCHAR(50) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE welfare_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE occupations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  welfare_board_id UUID NOT NULL REFERENCES welfare_boards(id),
  name VARCHAR(150) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (welfare_board_id, name)
);

CREATE TABLE worker_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  registration_number VARCHAR(40) UNIQUE NOT NULL,
  welfare_board_id UUID NOT NULL REFERENCES welfare_boards(id),
  occupation_id UUID NOT NULL REFERENCES occupations(id),
  aadhaar_last4 CHAR(4) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20) NOT NULL,
  community VARCHAR(50),
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  village VARCHAR(100) NOT NULL,
  taluk VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  pincode VARCHAR(6) NOT NULL,
  bank_name VARCHAR(120) NOT NULL,
  ifsc VARCHAR(11) NOT NULL,
  account_number VARCHAR(30) NOT NULL,
  status registration_status NOT NULL DEFAULT 'DRAFT',
  rejection_reason TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  registration_expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE nominees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES worker_registrations(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  date_of_birth DATE,
  mobile VARCHAR(10),
  share_percentage NUMERIC(5,2) DEFAULT 100.00
);

CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES worker_registrations(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  date_of_birth DATE,
  aadhaar_last4 CHAR(4)
);

CREATE TABLE document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  owner_type document_owner_type NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type document_owner_type NOT NULL,
  registration_id UUID REFERENCES worker_registrations(id) ON DELETE CASCADE,
  claim_id UUID,
  document_type_id UUID NOT NULL REFERENCES document_types(id),
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_key TEXT NOT NULL,
  checksum_sha256 TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  verification_status VARCHAR(30) DEFAULT 'PENDING',
  remarks TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((registration_id IS NOT NULL) OR (claim_id IS NOT NULL))
);

CREATE TABLE schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  claim_type VARCHAR(80) NOT NULL,
  benefit_amount NUMERIC(12,2),
  eligibility_rules JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id VARCHAR(40) UNIQUE NOT NULL,
  registration_id UUID NOT NULL REFERENCES worker_registrations(id),
  scheme_id UUID NOT NULL REFERENCES schemes(id),
  status claim_status NOT NULL DEFAULT 'DRAFT',
  requested_amount NUMERIC(12,2),
  approved_amount NUMERIC(12,2),
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE documents
  ADD CONSTRAINT documents_claim_fk FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE;

CREATE TABLE smart_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID UNIQUE NOT NULL REFERENCES worker_registrations(id),
  card_number VARCHAR(40) UNIQUE NOT NULL,
  qr_payload TEXT NOT NULL,
  pdf_storage_key TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES worker_registrations(id),
  claim_id UUID REFERENCES claims(id),
  actor_id UUID NOT NULL REFERENCES users(id),
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 3. RESTful API Endpoint Specification

### Authentication and OTP

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/otp/request` | Send OTP to worker mobile number. |
| `POST` | `/api/auth/otp/verify` | Verify OTP and create/login worker account. |
| `POST` | `/api/auth/staff/login` | Staff/admin password login. |
| `POST` | `/api/auth/refresh` | Rotate refresh token. |

Request:

```json
{
  "mobile": "9876543210",
  "purpose": "REGISTRATION_LOGIN"
}
```

Response:

```json
{
  "message": "OTP sent successfully",
  "requestId": "otp_01J...",
  "expiresInSeconds": 300
}
```

### Master data

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/welfare-boards` | List active welfare boards. |
| `GET` | `/api/welfare-boards/{boardId}/occupations` | List occupations for a board. |
| `GET` | `/api/schemes` | List claim schemes available to the logged-in worker. |
| `GET` | `/api/document-types?ownerType=REGISTRATION` | List required documents. |

### Worker registration

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/registrations` | Create worker registration draft. |
| `GET` | `/api/registrations/{registrationId}` | View registration details. |
| `PATCH` | `/api/registrations/{registrationId}` | Update draft registration details. |
| `POST` | `/api/registrations/{registrationId}/documents` | Upload Aadhaar, ration card, bank passbook, photo, and work certificate. |
| `POST` | `/api/registrations/{registrationId}/submit` | Submit registration for verification. |
| `GET` | `/api/registrations/{registrationId}/status` | Track current registration status and logs. |

Create registration request:

```json
{
  "welfareBoardId": "c869227e-9ad1-4f5e-a7d0-2e2c69e8cc3b",
  "occupationId": "8757ee95-6947-4dbc-b06c-25cc5d19d5da",
  "personal": {
    "fullName": "Bala Kumar",
    "dateOfBirth": "1990-05-10",
    "gender": "MALE",
    "aadhaarLast4": "1234"
  },
  "address": {
    "line1": "12 North Street",
    "village": "Example Village",
    "taluk": "Madurai North",
    "district": "Madurai",
    "pincode": "625001"
  },
  "bank": {
    "bankName": "Indian Bank",
    "ifsc": "IDIB000M001",
    "accountNumber": "123456789012"
  },
  "nominee": {
    "fullName": "Meena Kumar",
    "relationship": "Spouse",
    "mobile": "9876543211"
  }
}
```

Create registration response:

```json
{
  "registrationId": "5bbf2a8e-377e-49f2-989c-96a0298fe798",
  "registrationNumber": "TNUWWB-20260811-4F7A2C",
  "status": "DRAFT",
  "nextStep": "UPLOAD_REQUIRED_DOCUMENTS"
}
```

### Verification dashboard

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/verifier/registrations?status=PENDING_VERIFICATION` | List assigned registrations. |
| `GET` | `/api/verifier/registrations/{registrationId}` | Inspect applicant profile and documents. |
| `POST` | `/api/verifier/registrations/{registrationId}/field-verify` | Move application to field verification. |
| `POST` | `/api/verifier/registrations/{registrationId}/approve` | Approve eligible registration. |
| `POST` | `/api/verifier/registrations/{registrationId}/reject` | Reject with reason. |

Decision request:

```json
{
  "remarks": "Documents verified and applicant is eligible",
  "fieldOfficerId": "fb3f2fd2-d474-4975-a7f0-cad4c790cc2f"
}
```

Decision response:

```json
{
  "registrationId": "5bbf2a8e-377e-49f2-989c-96a0298fe798",
  "fromStatus": "FIELD_VERIFICATION",
  "toStatus": "APPROVED",
  "smartCardQueued": true
}
```

### Scheme claims

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/claims` | Create a claim draft for education, marriage, maternity, pension, or accident relief. |
| `POST` | `/api/claims/{claimId}/documents` | Upload supporting claim documents. |
| `POST` | `/api/claims/{claimId}/submit` | Submit claim for review. |
| `GET` | `/api/claims/{trackingId}/status` | Track claim with real-time tracking ID. |
| `POST` | `/api/verifier/claims/{claimId}/approve` | Approve claim and amount. |
| `POST` | `/api/verifier/claims/{claimId}/reject` | Reject claim with reason. |

Claim request:

```json
{
  "registrationId": "5bbf2a8e-377e-49f2-989c-96a0298fe798",
  "schemeId": "9b86298e-2d86-4765-a6c0-2b4fc6c358f7",
  "requestedAmount": 25000,
  "claimDetails": {
    "beneficiaryName": "Meena Kumar",
    "eventDate": "2026-09-01",
    "notes": "Marriage grant application"
  }
}
```

Claim response:

```json
{
  "claimId": "f3cdf58d-132e-45b9-b86d-3968d89fb4bf",
  "trackingId": "CLM-20260811-A82D19",
  "status": "DRAFT",
  "nextStep": "UPLOAD_SUPPORTING_DOCUMENTS"
}
```

### Smart card

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/registrations/{registrationId}/smart-card/generate` | Generate card after approval. |
| `GET` | `/api/smart-cards/{cardNumber}` | Return card metadata. |
| `GET` | `/api/smart-cards/{cardNumber}/download` | Download PDF smart card. |
| `GET` | `/api/smart-cards/verify/{qrToken}` | Public QR verification endpoint. |

Smart-card response:

```json
{
  "cardNumber": "TNUWWB-CARD-2026-000123",
  "workerId": "TNUWWB-20260811-4F7A2C",
  "expiresAt": "2027-08-11",
  "downloadUrl": "https://example.gov/cards/TNUWWB-CARD-2026-000123.pdf",
  "qrVerifyUrl": "https://example.gov/verify/eyJhbGciOi..."
}
```

## 4. Three-Month MVP Implementation Roadmap

### Month 1: Foundation and worker registration

- **Week 1**: Finalize user roles, registration fields, scheme catalog, document checklist, status transitions, and data dictionary.
- **Week 2**: Set up monorepo, Docker Compose, PostgreSQL, backend project, React web frontend, Flutter app shell, linting, formatting, and CI checks.
- **Week 3**: Build OTP login, JWT sessions, staff login, RBAC middleware, welfare board master data, occupation master data, and registration draft APIs.
- **Week 4**: Build worker registration screens, validation for 18–60 age eligibility, bank IFSC/account fields, nominee/family details, document upload APIs, and local/S3-compatible file storage.

### Month 2: Verification and claims

- **Week 5**: Implement registration submission, verifier queues, status transitions, verification logs, and document preview/download with signed URLs.
- **Week 6**: Build VAO/RI/Assistant Commissioner dashboards for inspect, field-verify, approve, reject, and rejection-reason workflows.
- **Week 7**: Implement scheme catalog, claim creation, claim document upload, claim submission, and tracking ID generation.
- **Week 8**: Implement claim review dashboard, claim approval/rejection, status tracking page, SMS/email notifications, and audit reports.

### Month 3: Smart card, polish, testing, and demo

- **Week 9**: Generate worker registration numbers, QR payloads, smart-card PDFs, public QR verification pages, and card expiry logic.
- **Week 10**: Improve accessibility, responsive UI, mobile app flows, officer offline notes draft, dashboard filters, and admin master-data screens.
- **Week 11**: Add automated tests for API services, database constraints, status transitions, upload validation, OTP edge cases, and role permissions.
- **Week 12**: Complete UAT scenarios, seed demo data, prepare project report, architecture diagrams, API collection, deployment guide, and final presentation video.

## Suggested MVP acceptance criteria

- A worker can register using mobile OTP and submit a complete application with required documents.
- A verifier can inspect, approve, or reject applications with remarks and immutable logs.
- Approved workers receive a generated worker ID and downloadable QR smart card.
- Registered workers can submit at least two claim types with supporting documents.
- Workers can track registration and claim status using reference numbers.
- Admin users can configure boards, occupations, schemes, and document requirements.
