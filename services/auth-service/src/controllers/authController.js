import { validationResult } from 'express-validator';
import {
  registerPatientService,
  registerDoctorService,
  loginService,
  refreshTokenService,
  logoutService,
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
    return sendSuccess(res, data, 'Doctor registered successfully', 201);
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
