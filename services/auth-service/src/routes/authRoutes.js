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
