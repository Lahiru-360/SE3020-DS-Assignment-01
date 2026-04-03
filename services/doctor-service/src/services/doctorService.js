import {
  createDoctor,
  findDoctorByUserId,
  findDoctorByLicense,
  updateDoctorByUserId,
  findPendingDoctors,
  approveDoctorByUserId,
  deleteDoctorByUserId,
} from "../repositories/doctorRepository.js";
import { createHttpError } from "../utils/httpError.js";

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
  if (existingByUser)
    throw createHttpError("Doctor profile already exists for this user", 409);

  const existingByLicense = await findDoctorByLicense(licenseNumber);
  if (existingByLicense)
    throw createHttpError("License number already registered", 409);

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

export const updateDoctorProfileService = async (userId, updateData) => {
  if (Object.keys(updateData).length === 0) {
    throw createHttpError("No fields provided to update", 400);
  }

  // If updating license, make sure it's not taken by another doctor
  if (updateData.licenseNumber) {
    const existingByLicense = await findDoctorByLicense(
      updateData.licenseNumber,
    );
    if (existingByLicense && existingByLicense.userId !== userId) {
      throw createHttpError(
        "License number already registered to another doctor",
        409,
      );
    }
  }

  const updatedDoctor = await updateDoctorByUserId(userId, updateData);
  if (!updatedDoctor) throw createHttpError("Doctor profile not found", 404);

  return updatedDoctor;
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
  if (!doctor) throw createHttpError("Doctor profile not found", 404);
  return doctor;
};

export const deleteDoctorProfileService = async (userId) => {
  const result = await deleteDoctorByUserId(userId);
  if (result.deletedCount === 0)
    throw createHttpError("Doctor profile not found", 404);
};
