import { validationResult } from 'express-validator';
import { createDoctorProfileService } from '../services/doctorService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const createProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);
    const doctor = await createDoctorProfileService(req.body);
    return sendSuccess(res, doctor, 'Doctor profile created', 201);
  } catch (e) {
    next(e);
  }
};
