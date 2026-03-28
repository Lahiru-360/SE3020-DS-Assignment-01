// ─────────────────────────────────────────────────────────────────
// Patient Routes
//
// POST /profile — INTERNAL only. Called by auth-service during the
//   registration flow. Protected by x-internal-secret header.
//
// PATCH /me — PUBLIC-FACING via API Gateway. Requires a valid patient
//   JWT (verified at gateway). userId and role are read from the
//   x-user-id / x-user-role headers injected by the gateway.
// ─────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { createProfile, updateProfile } from '../controllers/patientController.js';
import {
  createPatientProfileValidators,
  updatePatientProfileValidators,
} from '../validators/patientValidators.js';
import { requireInternalSecret } from '../middleware/internalAuth.js';

const router = Router();

// ── Internal (auth-service only) ──────────────────────────────────
router.post('/profile', requireInternalSecret, createPatientProfileValidators, createProfile);

// ── Patient-facing (via API Gateway) ──────────────────────────────
router.patch('/me', updatePatientProfileValidators, updateProfile);

export default router;
