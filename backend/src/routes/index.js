import { Router } from 'express';
import { login } from '../controllers/authController.js';
import { stats } from '../controllers/dashboardController.js';
import { createWorker, listWorkers, renewWorker } from '../controllers/workersController.js';
import { authenticate } from '../middleware/auth.js';

export const router = Router();
router.post('/auth/login', login);
router.get('/workers', authenticate, listWorkers);
router.post('/workers', authenticate, createWorker);
router.put('/workers/:id/renew', authenticate, renewWorker);
router.get('/dashboard/stats', authenticate, stats);
