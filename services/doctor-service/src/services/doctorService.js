import {
  createDoctor,
  findDoctorByUserId,
  findDoctorByLicense,
  updateDoctorByUserId,
  findPendingDoctors,
  approveDoctorByUserId,
  deleteDoctorByUserId,
  searchDoctors,
} from "../repositories/doctorRepository.js";
import { createHttpError } from "../utils/httpError.js";

const normalizeConsultationFee = (value) => {
  if (value === "" || value === null || value === undefined) return null;

  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const isValidConsultationFee = (value) =>
  typeof value === "number" && value > 0 && value <= 10000;

export const createDoctorProfileService = async ({
  userId,
  email,
  firstName,
  lastName,
  phone,
  specialization,
  licenseNumber,
  consultationFee,
}) => {
  const fee = normalizeConsultationFee(consultationFee);

  if (!isValidConsultationFee(fee)) {
    throw createHttpError(
      "Consultation fee must be a number between 0 and 10,000 LKR",
      400,
    );
  }

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
    consultationFee: fee,
  });

  return doctor;
};

export const updateDoctorProfileService = async (userId, updateData) => {
  if (Object.keys(updateData).length === 0) {
    throw createHttpError("No fields provided to update", 400);
  }

  if (updateData.consultationFee !== undefined) {
    const fee = normalizeConsultationFee(updateData.consultationFee);

    if (!isValidConsultationFee(fee)) {
      throw createHttpError(
        "Consultation fee must be a number between 0 and 10,000 LKR",
        400,
      );
    }

    updateData.consultationFee = fee;
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

// ─── Internal search (called by appointment-service) ─────────────────────────

export const searchDoctorsService = async ({ specialization, name } = {}) => {
  if (!specialization && !name) {
    throw createHttpError('At least one search filter (specialization or name) is required', 400);
  }

  const doctors = await searchDoctors({ specialization, name });
  return doctors;
};
