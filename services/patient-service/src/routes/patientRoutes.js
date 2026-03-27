// ─────────────────────────────────────────────
// Patient Routes — INTERNAL only.
// This service is never exposed through the
// API Gateway directly. It is called by
// auth-service during the registration flow.
// ─────────────────────────────────────────────

import { Router } from 'express';
import { createProfile } from '../controllers/patientController.js';
import { createPatientProfileValidators } from '../validators/patientValidators.js';

const router = Router();

router.post('/profile', createPatientProfileValidators, createProfile);

export default router;
