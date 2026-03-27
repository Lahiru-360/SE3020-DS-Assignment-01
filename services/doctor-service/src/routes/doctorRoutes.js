// ─────────────────────────────────────────────
// Doctor Routes — INTERNAL only.
// This service is never exposed through the
// API Gateway directly. It is called by
// auth-service during the registration flow.
// ─────────────────────────────────────────────

import { Router } from 'express';
import { createProfile } from '../controllers/doctorController.js';
import { createDoctorProfileValidators } from '../validators/doctorValidators.js';

const router = Router();

router.post('/profile', createDoctorProfileValidators, createProfile);

export default router;
