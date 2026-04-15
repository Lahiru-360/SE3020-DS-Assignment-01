import { validationResult } from 'express-validator';
import {
  registerPatientService,
  registerDoctorService,
  loginService,
  refreshTokenService,
  logoutService,
  getPendingDoctorsService,
  approveDoctorService,
  rejectDoctorService,
  getAllUsersService,
  getUserByIdService,
  deactivateUserService,
  activateUserService,
  deleteUserService,
} from '../services/authService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const registerPatient = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);
    const data = await registerPatientService(req.body);
    return sendSuccess(res, data, 'Patient registered successfully', 201);
  } catch (e) {
    next(e);
  }
};

export const registerDoctor = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);
    const data = await registerDoctorService(req.body);
    return sendSuccess(res, data, 'Registration submitted. Your account is pending admin approval.', 201);
  } catch (e) {
    next(e);
  }
};

export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);
    const data = await loginService(req.body);
    return sendSuccess(res, data, 'Login successful', 200);
  } catch (e) {
    next(e);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const data = refreshTokenService(req.body.refreshToken);
    return sendSuccess(res, data, 'Token refreshed successfully', 200);
  } catch (e) {
    next(e);
  }
};

export const logout = async (req, res, next) => {
  try {
    logoutService();
    return sendSuccess(res, null, 'Logged out successfully', 200);
  } catch (e) {
    next(e);
  }
};

// ─── Admin controllers ─────────────────────────────────────────────────────

const requireAdmin = (req, res, next) => {
  if (req.headers['x-user-role'] !== 'admin') {
    return sendError(res, 'Admin access required', 403);
  }
  next();
};

export const getPendingDoctors = [
  requireAdmin,
  async (req, res, next) => {
    try {
      const doctors = await getPendingDoctorsService();
      return sendSuccess(res, doctors, 'Pending doctors retrieved', 200);
    } catch (e) {
      next(e);
    }
  },
];

export const approveDoctor = [
  requireAdmin,
  async (req, res, next) => {
    try {
      await approveDoctorService(req.params.userId);
      return sendSuccess(res, null, 'Doctor approved successfully', 200);
    } catch (e) {
      next(e);
    }
  },
];

export const rejectDoctor = [
  requireAdmin,
  async (req, res, next) => {
    try {
      await rejectDoctorService(req.params.userId);
      return sendSuccess(res, null, 'Doctor rejected and account removed', 200);
    } catch (e) {
      next(e);
    }
  },
];

// ─── Admin user-management controllers ────────────────────────────────────

export const getAllUsers = [
  requireAdmin,
  async (req, res, next) => {
    try {
      const data = await getAllUsersService(req.query);
      return sendSuccess(res, data, 'Users retrieved', 200);
    } catch (e) {
      next(e);
    }
  },
];

export const getUserById = [
  requireAdmin,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);
      const user = await getUserByIdService(req.params.userId);
      return sendSuccess(res, user, 'User retrieved', 200);
    } catch (e) {
      next(e);
    }
  },
];

export const deactivateUser = [
  requireAdmin,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);
      await deactivateUserService(req.params.userId, req.headers['x-user-id']);
      return sendSuccess(res, null, 'User deactivated successfully', 200);
    } catch (e) {
      next(e);
    }
  },
];

export const activateUser = [
  requireAdmin,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);
      await activateUserService(req.params.userId);
      return sendSuccess(res, null, 'User activated successfully', 200);
    } catch (e) {
      next(e);
    }
  },
];

export const deleteUser = [
  requireAdmin,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);
      await deleteUserService(req.params.userId, req.headers['x-user-id']);
      return sendSuccess(res, null, 'User deleted successfully', 200);
    } catch (e) {
      next(e);
    }
  },
];
