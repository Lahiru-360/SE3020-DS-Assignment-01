import { validationResult } from "express-validator";
import {
  createDoctorProfileService,
  updateDoctorProfileService,
  getDoctorByUserIdService,
  getPendingDoctorsService,
  approveDoctorProfileService,
  deleteDoctorProfileService,
  searchDoctorsService,
} from "../services/doctorService.js";
import { sendSuccess, sendError } from "../utils/responseHelper.js";

export const createProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);
    const doctor = await createDoctorProfileService(req.body);
    return sendSuccess(res, doctor, "Doctor profile created", 201);
  } catch (e) {
    next(e);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const { userId } = req.params;
    const authenticatedUserId = req.headers["x-user-id"];

    if (!authenticatedUserId || authenticatedUserId !== userId) {
      return sendError(
        res,
        "Forbidden: you can only update your own profile",
        403,
      );
    }

    const doctor = await updateDoctorProfileService(userId, req.body);
    return sendSuccess(res, doctor, "Doctor profile updated successfully", 200);
  } catch (e) {
    next(e);
  }
};

// ─── Internal lookup (called by appointment-service) ──────────────────────

export const getDoctorInternal = async (req, res, next) => {
  try {
    const doctor = await getDoctorByUserIdService(req.params.userId);
    return sendSuccess(res, doctor, 'Doctor profile retrieved');
  } catch (e) {
    next(e);
  }
};

// ─── Internal admin controllers ────────────────────────────────────────────

export const getPendingDoctors = async (req, res, next) => {
  try {
    const doctors = await getPendingDoctorsService();
    return sendSuccess(res, doctors, "Pending doctors retrieved", 200);
  } catch (e) {
    next(e);
  }
};

export const approveDoctor = async (req, res, next) => {
  try {
    const doctor = await approveDoctorProfileService(req.params.userId);
    return sendSuccess(res, doctor, "Doctor profile approved", 200);
  } catch (e) {
    next(e);
  }
};

export const deleteDoctorProfile = async (req, res, next) => {
  try {
    await deleteDoctorProfileService(req.params.userId);
    return sendSuccess(res, null, "Doctor profile removed", 200);
  } catch (e) {
    next(e);
  }
};

// ─── Internal search (called by appointment-service) ─────────────────────────

export const searchDoctors = async (req, res, next) => {
  try {
    const { specialization, name } = req.query;
    const doctors = await searchDoctorsService({ specialization, name });
    return sendSuccess(res, doctors, 'Doctors retrieved');
  } catch (e) {
    next(e);
  }
};
