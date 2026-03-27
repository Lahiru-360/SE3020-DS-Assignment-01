import { createPatient, findPatientByUserId } from '../repositories/patientRepository.js';
import { createHttpError } from '../utils/httpError.js';

export const createPatientProfileService = async ({ userId, email, firstName, lastName, phone }) => {
  const existing = await findPatientByUserId(userId);
  if (existing) throw createHttpError('Patient profile already exists for this user', 409);

  const patient = await createPatient({ userId, email, firstName, lastName, phone });
  return patient;
};
