// ─────────────────────────────────────────────
// Doctor Routes
//
// POST /profile — INTERNAL only, called by auth-service
//   during the registration flow. Never exposed via
//   the API Gateway.
//
// /internal/* — INTERNAL only, called by auth-service
//   for admin approval/rejection. Protected by the
//   x-internal-secret header. Never exposed via the
//   API Gateway.
// ─────────────────────────────────────────────

import { Router } from 'express';
import {
  createProfile,
  getPendingDoctors,
  approveDoctor,
  deleteDoctorProfile,
} from '../controllers/doctorController.js';
import { createDoctorProfileValidators } from '../validators/doctorValidators.js';
import { requireInternalSecret } from '../middleware/internalAuth.js';

const router = Router();

// ── Profile creation (internal — auth-service only) ───────────────────────
router.post('/profile', createDoctorProfileValidators, createProfile);

// ── Admin approval (internal — auth-service only) ─────────────────────────
router.get('/internal/pending', requireInternalSecret, getPendingDoctors);
router.patch('/internal/:userId/approve', requireInternalSecret, approveDoctor);
router.delete('/internal/:userId', requireInternalSecret, deleteDoctorProfile);

export default router;

