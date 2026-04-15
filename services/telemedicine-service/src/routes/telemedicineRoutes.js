// ─────────────────────────────────────────────────────────────────────────────
// Telemedicine Routes
//
// All routes in this file are reached via the API Gateway which has already:
//   1. Verified the JWT
//   2. Injected x-user-id, x-user-role, x-user-email into the request headers
//
// Role enforcement is done at the gateway level.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { getOrCreateSession, endSession } from '../controllers/telemedicineController.js';

const router = Router();

// GET  /api/telemedicine/sessions/:appointmentId      — get or create session
// POST /api/telemedicine/sessions/:appointmentId/end  — doctor ends session
router.get('/:appointmentId',      getOrCreateSession);
router.post('/:appointmentId/end', endSession);

export default router;
