import { z } from 'zod';
import { query } from '../config/db.js';
import { scopedLocationClauses } from '../middleware/auth.js';

const workerSchema = z.object({
  registration_number: z.string().min(3), full_name: z.string().min(2), dob: z.string(), gender: z.string(),
  phone_number: z.string().min(10), location_id: z.number().int(), board_id: z.number().int(),
  registration_date: z.string(), last_renewal_date: z.string(),
});

const baseSelect = `
  SELECT w.*, l.district, l.taluk, l.village_panchayat, wb.board_name,
  DATE_PART('year', AGE(CURRENT_DATE, w.dob))::int AS age,
  CASE WHEN DATE_PART('year', AGE(CURRENT_DATE, w.dob)) >= 60 THEN '60_PLUS'
       WHEN DATE_PART('year', AGE(CURRENT_DATE, w.dob)) >= 51 THEN '51_59'
       WHEN DATE_PART('year', AGE(CURRENT_DATE, w.dob)) >= 36 THEN '36_50' ELSE '18_35' END AS age_bracket,
  CASE WHEN DATE_PART('year', AGE(CURRENT_DATE, w.dob)) >= 60 THEN 'PENSIONER'
       WHEN w.next_due_date < CURRENT_DATE THEN 'OVERDUE' ELSE 'ACTIVE' END AS computed_status
  FROM workers w JOIN locations l ON l.id = w.location_id JOIN welfare_boards wb ON wb.id = w.board_id`;

export async function listWorkers(req, res, next) {
  try {
    const params = [];
    const clauses = scopedLocationClauses(req.user, req.query, params);
    for (const [key, column] of [['board_id', 'w.board_id'], ['status', 'w.status']]) {
      if (req.query[key] && req.query[key] !== '60_PLUS') { params.push(req.query[key]); clauses.push(`${column} = $${params.length}`); }
    }
    if (req.query.status === '60_PLUS') clauses.push(`DATE_PART('year', AGE(CURRENT_DATE, w.dob)) >= 60`);
    if (req.query.age_category) {
      const map = { '18_35': [18, 35], '36_50': [36, 50], '51_59': [51, 59], '60_PLUS': [60, 200] };
      const [min, max] = map[req.query.age_category] || [];
      if (min) clauses.push(`DATE_PART('year', AGE(CURRENT_DATE, w.dob)) BETWEEN ${min} AND ${max}`);
    }
    if (req.query.search) { params.push(`%${req.query.search}%`); clauses.push(`(w.full_name ILIKE $${params.length} OR w.registration_number ILIKE $${params.length})`); }
    const sql = `${baseSelect} ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY w.next_due_date ASC LIMIT 500`;
    const { rows } = await query(sql, params);
    return res.json({ data: rows });
  } catch (error) { return next(error); }
}

export async function createWorker(req, res, next) {
  try {
    const body = workerSchema.parse(req.body);
    const { rows } = await query(`
      INSERT INTO workers (registration_number, full_name, dob, gender, phone_number, location_id, board_id, registration_date, last_renewal_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [body.registration_number, body.full_name, body.dob, body.gender, body.phone_number, body.location_id, body.board_id, body.registration_date, body.last_renewal_date]);
    return res.status(201).json({ data: rows[0] });
  } catch (error) { return next(error); }
}

export async function renewWorker(req, res, next) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await query(`UPDATE workers SET last_renewal_date=$1, status='ACTIVE', updated_at=now() WHERE id=$2 RETURNING *`, [today, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Worker not found.' });
    return res.json({ data: rows[0] });
  } catch (error) { return next(error); }
}
