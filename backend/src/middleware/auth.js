import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-only-change-me');
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function scopedLocationClauses(user, filters, params) {
  const clauses = [];
  if (user.role === 'FIELD_OFFICER') {
    params.push(user.assigned_district);
    clauses.push(`l.district = $${params.length}`);
    if (user.assigned_taluk) {
      params.push(user.assigned_taluk);
      clauses.push(`l.taluk = $${params.length}`);
    }
  } else if (filters.district) {
    params.push(filters.district);
    clauses.push(`l.district = $${params.length}`);
  }
  if (filters.taluk && user.role !== 'FIELD_OFFICER') {
    params.push(filters.taluk);
    clauses.push(`l.taluk = $${params.length}`);
  }
  return clauses;
}
