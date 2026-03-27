// ─────────────────────────────────────────────
// Auth Routes — all routes here are PUBLIC.
// The API Gateway whitelists /api/auth/* and
// does NOT apply JWT verification to any of
// these routes.
// ─────────────────────────────────────────────

import { Router } from 'express';
import {
  registerPatient,
  registerDoctor,
  login,
  refreshToken,
  logout,
} from '../controllers/authController.js';
import {
  registerPatientValidators,
  registerDoctorValidators,
  loginValidators,
} from '../validators/authValidators.js';

const router = Router();

router.post('/register/patient', registerPatientValidators, registerPatient);
router.post('/register/doctor', registerDoctorValidators, registerDoctor);
router.post('/login', loginValidators, login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

export default router;
