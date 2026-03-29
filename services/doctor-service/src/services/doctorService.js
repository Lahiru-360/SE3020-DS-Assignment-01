import {
  createDoctor,
  findDoctorByUserId,
  findDoctorByLicense,
  findPendingDoctors,
  approveDoctorByUserId,
  deleteDoctorByUserId,
} from '../repositories/doctorRepository.js';
import { createHttpError } from '../utils/httpError.js';

export const createDoctorProfileService = async ({
  userId,
  email,
  firstName,
  lastName,
  phone,
  specialization,
  licenseNumber,
}) => {
  const existingByUser = await findDoctorByUserId(userId);
  if (existingByUser) throw createHttpError('Doctor profile already exists for this user', 409);

  const existingByLicense = await findDoctorByLicense(licenseNumber);
  if (existingByLicense) throw createHttpError('License number already registered', 409);

  const doctor = await createDoctor({
    userId,
    email,
    firstName,
    lastName,
    phone,
    specialization,
    licenseNumber,
  });

  return doctor;
};

// ─── Internal lookup (called by appointment-service) ─────────────────────────

export const getDoctorByUserIdService = async (userId) => {
  const doctor = await findDoctorByUserId(userId);
  if (!doctor) throw createHttpError('Doctor profile not found', 404);
  return doctor;
};

// ─── Internal admin service functions ─────────────────────────────────────

export const getPendingDoctorsService = () => findPendingDoctors();

export const approveDoctorProfileService = async (userId) => {
  const doctor = await approveDoctorByUserId(userId);
  if (!doctor) throw createHttpError('Doctor profile not found', 404);
  return doctor;
};

export const deleteDoctorProfileService = async (userId) => {
  const result = await deleteDoctorByUserId(userId);
  if (result.deletedCount === 0) throw createHttpError('Doctor profile not found', 404);
};

