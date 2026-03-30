import { createPatient, findPatientByUserId, updatePatientByUserId } from '../repositories/patientRepository.js';
import { createHttpError } from '../utils/httpError.js';

export const createPatientProfileService = async ({ userId, email, firstName, lastName, phone }) => {
  const existing = await findPatientByUserId(userId);
  if (existing) throw createHttpError('Patient profile already exists for this user', 409);

  const patient = await createPatient({ userId, email, firstName, lastName, phone });
  return patient;
};

export const updatePatientProfileService = async (userId, fields) => {
  const patient = await updatePatientByUserId(userId, fields);
  if (!patient) throw createHttpError('Patient profile not found', 404);
  return patient;
};

// ─── Internal lookup (called by appointment-service) ──────────────────────
export const getPatientByUserIdService = async (userId) => {
  const patient = await findPatientByUserId(userId);
  if (!patient) throw createHttpError('Patient profile not found', 404);
  return patient;
};
