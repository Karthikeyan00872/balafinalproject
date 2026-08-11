import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { router } from './routes/index.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'tnuwwb-ledger-api' }));
app.use('/api', router);
app.use((error, _req, res, _next) => {
  if (error.name === 'ZodError') return res.status(400).json({ error: 'Validation failed.', details: error.errors });
  if (error.code === '23505') return res.status(409).json({ error: 'Duplicate record violates a unique constraint.' });
  console.error(error);
  return res.status(500).json({ error: 'Internal server error.' });
});
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`TNUWWB Ledger API listening on ${port}`));
