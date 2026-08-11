import { query } from '../config/db.js';
import { scopedLocationClauses } from '../middleware/auth.js';

export async function stats(req, res, next) {
  try {
    const params = [];
    const clauses = scopedLocationClauses(req.user, req.query, params);
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await query(`
      SELECT COUNT(*)::int AS total_workers,
      COUNT(*) FILTER (WHERE w.next_due_date < CURRENT_DATE AND DATE_PART('year', AGE(CURRENT_DATE, w.dob)) < 60)::int AS total_overdue,
      COUNT(*) FILTER (WHERE DATE_PART('year', AGE(CURRENT_DATE, w.dob)) >= 60)::int AS pension_pending_count,
      COUNT(c.id) FILTER (WHERE c.status IN ('SUBMITTED','UNDER_REVIEW'))::int AS active_claims
      FROM workers w JOIN locations l ON l.id=w.location_id LEFT JOIN claims c ON c.worker_id=w.id ${where}`, params);
    const breakdown = await query(`
      SELECT l.district, COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE w.next_due_date < CURRENT_DATE AND DATE_PART('year', AGE(CURRENT_DATE, w.dob)) < 60)::int AS overdue
      FROM workers w JOIN locations l ON l.id=w.location_id ${where} GROUP BY l.district ORDER BY l.district`, params);
    return res.json({ ...rows[0], district_breakdown: breakdown.rows });
  } catch (error) { return next(error); }
}
