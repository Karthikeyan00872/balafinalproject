# TNUWWB Record Management & Due-Tracking Dashboard

Production-oriented full-stack blueprint for replacing paper renewal ledgers used by Tamil Nadu Unorganised Workers Welfare Board offices.

## Stack

- **Frontend:** React + Vite, Lucide icons, Recharts, responsive CSS utility classes.
- **Backend:** Node.js, Express REST API, JWT authentication, bcrypt password verification, role-scoped middleware.
- **Database:** PostgreSQL relational schema with generated five-year `next_due_date` and indexes for district/taluk due tracking.

## Business Rules Implemented

- Workers renew every **5 years** from `last_renewal_date`.
- Age brackets: `18_35`, `36_50`, `51_59`, and `60_PLUS`.
- 60+ workers are presented as pension-transition records and are excluded from standard overdue counts.
- Admins can query all districts; field officers are forced to their assigned district/taluk scope by JWT claims.

## Key Files

- `database/schema.sql` — DDL for `roles`, `users`, `locations`, `welfare_boards`, `workers`, and `claims`.
- `backend/src/server.js` — Express application bootstrap and error handling.
- `backend/src/controllers` — Login, worker list/create/renew, and dashboard statistics controllers.
- `frontend/src/components/Dashboard.jsx` — Dashboard navigation, metrics, filters, worker table, chart, and CSV export.

## Local Development

```bash
npm run install:all
createdb tnuwwb_ledger
psql tnuwwb_ledger < database/schema.sql
npm --prefix backend run dev
npm --prefix frontend run dev
```

Set `JWT_SECRET` and PostgreSQL connection environment variables in production. Create users with bcrypt password hashes and role IDs from the seeded `roles` table.

## REST API

- `POST /api/auth/login` — returns `{ token, user }` with role and location scope.
- `GET /api/workers` — supports `district`, `taluk`, `board_id`, `age_category`, `status`, and `search` filters.
- `GET /api/dashboard/stats` — total workers, overdue count, district breakdown, pension pending count, active claims.
- `POST /api/workers` — creates a worker; PostgreSQL calculates `next_due_date` from `last_renewal_date`.
- `PUT /api/workers/:id/renew` — renews membership today and recalculates due date through generated column.
