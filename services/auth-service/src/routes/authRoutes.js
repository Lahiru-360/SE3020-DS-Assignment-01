// ─────────────────────────────────────────────
// Auth Routes
//
// Public routes (/api/auth/register/*, /api/auth/login,
//   /api/auth/refresh, /api/auth/logout) are whitelisted
//   by the API Gateway — no JWT required.
//
// Admin routes (/api/auth/admin/*) require a valid admin
//   JWT forwarded by the gateway (x-user-role: admin).
//   The requireAdmin guard is embedded in each controller.
// ─────────────────────────────────────────────

import { Router } from 'express';
import {
  registerPatient,
  registerDoctor,
  login,
  refreshToken,
  logout,
  getPendingDoctors,
  approveDoctor,
  rejectDoctor,
  getAllUsers,
  getUserById,
  deactivateUser,
  activateUser,
  deleteUser,
} from '../controllers/authController.js';
import {
  registerPatientValidators,
  registerDoctorValidators,
  loginValidators,
  adminUserIdValidators,
} from '../validators/authValidators.js';

const router = Router();

// ── Public ────────────────────────────────────
router.post('/register/patient', registerPatientValidators, registerPatient);
router.post('/register/doctor', registerDoctorValidators, registerDoctor);
router.post('/login', loginValidators, login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

// ── Admin (x-user-role header checked inside each controller array) ──
router.get('/admin/doctors/pending', getPendingDoctors);
router.patch('/admin/doctors/:userId/approve', approveDoctor);
router.delete('/admin/doctors/:userId', rejectDoctor);

// ── Admin — user account management ──────────────────────────────
router.get('/admin/users', getAllUsers);
router.get('/admin/users/:userId', adminUserIdValidators, getUserById);
router.patch('/admin/users/:userId/deactivate', adminUserIdValidators, deactivateUser);
router.patch('/admin/users/:userId/activate', adminUserIdValidators, activateUser);
router.delete('/admin/users/:userId', adminUserIdValidators, deleteUser);

export default router;
