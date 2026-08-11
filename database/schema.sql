CREATE TYPE role_name AS ENUM ('ADMIN', 'FIELD_OFFICER');
CREATE TYPE worker_status AS ENUM ('ACTIVE', 'OVERDUE', 'PENSIONER');
CREATE TYPE claim_type AS ENUM ('EDUCATION', 'MATERNITY', 'MARRIAGE', 'PENSION');
CREATE TYPE claim_status AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID');

CREATE TABLE roles (id SERIAL PRIMARY KEY, role_name role_name UNIQUE NOT NULL);
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY, username VARCHAR(80) UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id), assigned_district VARCHAR(100), assigned_taluk VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE locations (
  id BIGSERIAL PRIMARY KEY, district VARCHAR(100) NOT NULL, taluk VARCHAR(100) NOT NULL,
  village_panchayat VARCHAR(140) NOT NULL, pincode CHAR(6) NOT NULL,
  UNIQUE (district, taluk, village_panchayat, pincode)
);
CREATE TABLE welfare_boards (id SERIAL PRIMARY KEY, board_name VARCHAR(120) UNIQUE NOT NULL);
CREATE TABLE workers (
  id BIGSERIAL PRIMARY KEY, registration_number VARCHAR(50) UNIQUE NOT NULL, full_name VARCHAR(160) NOT NULL,
  dob DATE NOT NULL, gender VARCHAR(30) NOT NULL, phone_number VARCHAR(15) NOT NULL,
  location_id BIGINT NOT NULL REFERENCES locations(id), board_id INT NOT NULL REFERENCES welfare_boards(id),
  registration_date DATE NOT NULL, last_renewal_date DATE NOT NULL,
  next_due_date DATE GENERATED ALWAYS AS ((last_renewal_date + INTERVAL '5 years')::date) STORED,
  status worker_status NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE claims (
  id BIGSERIAL PRIMARY KEY, worker_id BIGINT NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  claim_type claim_type NOT NULL, status claim_status NOT NULL DEFAULT 'SUBMITTED', applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_workers_due ON workers(next_due_date);
CREATE INDEX idx_workers_location ON workers(location_id);
CREATE INDEX idx_locations_scope ON locations(district, taluk);

INSERT INTO roles(role_name) VALUES ('ADMIN'), ('FIELD_OFFICER') ON CONFLICT DO NOTHING;
INSERT INTO welfare_boards(board_name) VALUES ('Construction'), ('Tailoring'), ('Auto Drivers'), ('Domestic Workers'), ('Street Vendors') ON CONFLICT DO NOTHING;
