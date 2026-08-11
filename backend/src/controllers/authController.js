import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../config/db.js';

const loginSchema = z.object({ username: z.string().min(2), password: z.string().min(6) });

export async function login(req, res, next) {
  try {
    const body = loginSchema.parse(req.body);
    const { rows } = await query(`
      SELECT u.id, u.username, u.password_hash, u.assigned_district, u.assigned_taluk, r.role_name
      FROM users u JOIN roles r ON r.id = u.role_id WHERE u.username = $1
    `, [body.username]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role_name,
      assigned_district: user.assigned_district,
      assigned_taluk: user.assigned_taluk,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-only-change-me', { expiresIn: '8h' });
    return res.json({ token, user: payload });
  } catch (error) {
    return next(error);
  }
}
