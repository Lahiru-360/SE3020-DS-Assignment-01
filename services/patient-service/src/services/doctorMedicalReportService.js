import { supabase } from "../config/supabase.js";
import {
  findReportsByPatientId,
  findReportById,
} from "../repositories/medicalReportRepository.js";
import { createHttpError } from "../utils/httpError.js";

const BUCKET = "medical-reports";
const SIGNED_URL_EXPIRY_SECONDS = 3600;

const APPOINTMENT_SERVICE_URL =
  process.env.APPOINTMENT_SERVICE_URL || "http://appointment-service:5003";
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

/**
 * Verifies that the given doctor has at least one non-cancelled appointment
 * with the given patient by querying appointment-service via the internal API.
 * Throws 403 if no relationship is found.
 */
async function assertDoctorPatientRelationship(doctorId, patientId) {
  let appointments;

  try {
    const res = await fetch(
      `${APPOINTMENT_SERVICE_URL}/api/appointments/internal/by-doctor-patient?doctorId=${doctorId}&patientId=${patientId}`,
      {
        headers: {
          "x-internal-secret": INTERNAL_SECRET,
          "Content-Type": "application/json",
        },
      },
    );

    if (!res.ok) {
      // If the endpoint doesn't exist or fails, fall through to the catch
      throw new Error(`Appointment service responded with ${res.status}`);
    }

    const body = await res.json();
    appointments = body.data ?? [];
  } catch {
    throw createHttpError("Could not verify doctor-patient relationship", 502);
  }

  if (!appointments || appointments.length === 0) {
    throw createHttpError(
      "Forbidden: you don't have an appointment with this patient",
      403,
    );
  }
}

/**
 * List all medical reports for a patient (doctor-facing).
 */
export const listMedicalReportsForDoctorService = async (
  doctorId,
  patientId,
) => {
  await assertDoctorPatientRelationship(doctorId, patientId);
  return findReportsByPatientId(patientId);
};

/**
 * Get a signed URL for a specific report (doctor-facing).
 */
export const getSignedUrlForDoctorService = async (
  doctorId,
  patientId,
  reportId,
) => {
  await assertDoctorPatientRelationship(doctorId, patientId);

  const report = await findReportById(reportId);
  if (!report) throw createHttpError("Report not found", 404);
  if (report.patientId !== patientId)
    throw createHttpError("Report does not belong to this patient", 403);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(report.filePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error) {
    throw createHttpError(
      `Could not generate signed URL: ${error.message}`,
      502,
    );
  }

  return { url: data.signedUrl, expiresIn: SIGNED_URL_EXPIRY_SECONDS };
};
