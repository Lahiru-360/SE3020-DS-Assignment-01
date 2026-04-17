import { validationResult } from "express-validator";
import {
  createPatientProfileService,
  getPatientByUserIdService,
  updatePatientProfileService,
} from "../services/patientService.js";
import { sendSuccess, sendError } from "../utils/responseHelper.js";

export const createProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);
    const patient = await createPatientProfileService(req.body);
    return sendSuccess(res, patient, "Patient profile created", 201);
  } catch (e) {
    next(e);
  }
};

// ─── Internal lookup (called by appointment-service) ──────────────────────
export const getPatientInternal = async (req, res, next) => {
  try {
    const patient = await getPatientByUserIdService(req.params.userId);
    return sendSuccess(res, patient, "Patient profile retrieved");
  } catch (e) {
    next(e);
  }
};

export const getOwnProfile = async (req, res, next) => {
  try {
    const userId = req.headers["x-user-id"];
    const role = req.headers["x-user-role"];

    if (!userId) return sendError(res, "Unauthorized", 401);
    if (role !== "patient")
      return sendError(res, "Forbidden: patients only", 403);

    const patient = await getPatientByUserIdService(userId);
    return sendSuccess(res, patient, "Patient profile retrieved", 200);
  } catch (e) {
    next(e);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    // userId and role are injected by the gateway after JWT verification.
    const userId = req.headers["x-user-id"];
    const role = req.headers["x-user-role"];

    if (!userId) return sendError(res, "Unauthorized", 401);
    if (role !== "patient")
      return sendError(res, "Forbidden: patients only", 403);

    const { firstName, lastName, phone } = req.body;
    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (phone !== undefined) updates.phone = phone;

    const patient = await updatePatientProfileService(userId, updates);
    return sendSuccess(res, patient, "Profile updated successfully", 200);
  } catch (e) {
    next(e);
  }
};
