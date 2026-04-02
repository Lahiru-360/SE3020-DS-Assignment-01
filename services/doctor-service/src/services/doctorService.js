import {
  createDoctor,
  findDoctorByUserId,
  findDoctorByLicense,
  updateDoctorByUserId,
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
