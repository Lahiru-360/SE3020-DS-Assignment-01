import { validationResult } from 'express-validator';
import { createPatientProfileService } from '../services/patientService.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const createProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);
    const patient = await createPatientProfileService(req.body);
    return sendSuccess(res, patient, 'Patient profile created', 201);
  } catch (e) {
    next(e);
  }
};
