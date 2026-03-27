import {
  createDoctor,
  findDoctorByUserId,
  findDoctorByLicense,
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
