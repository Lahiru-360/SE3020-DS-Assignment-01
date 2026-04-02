import { validationResult } from "express-validator";
import {
  createDoctorProfileService,
  updateDoctorProfileService,
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
    const doctor = await updateDoctorProfileService(userId, req.body);
    return sendSuccess(res, doctor, "Doctor profile updated successfully", 200);
  } catch (e) {
    next(e);
  }
};
