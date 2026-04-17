import axiosInstance from "./axiosInstance";

/**
 * Upload a PDF medical record for the authenticated patient.
 * @param {FormData} formData — must contain a 'file' field (PDF) and optional 'description'
 */
export const uploadRecord = (formData) =>
  axiosInstance.post("/patients/me/reports", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/**
 * Get all medical records for the authenticated patient.
 */
export const getMyRecords = () => axiosInstance.get("/patients/me/reports");

/**
 * Get a short-lived Supabase signed URL for a specific record (patient).
 * @param {string} reportId
 */
export const getRecordSignedUrl = (reportId) =>
  axiosInstance.get(`/patients/me/reports/${reportId}/url`);

/**
 * Delete a medical record.
 * @param {string} reportId
 */
export const deleteRecord = (reportId) =>
  axiosInstance.delete(`/patients/me/reports/${reportId}`);

// ── Doctor-facing (read-only) ──────────────────────────────────────────────

/**
 * Get all medical records for a patient (doctor must have an appointment).
 * @param {string} patientId
 */
export const getPatientRecordsForDoctor = (patientId) =>
  axiosInstance.get(`/doctor-patients/${patientId}/reports`);

/**
 * Get a signed URL for a patient's record (doctor-facing).
 * @param {string} patientId
 * @param {string} reportId
 */
export const getPatientRecordSignedUrlForDoctor = (patientId, reportId) =>
  axiosInstance.get(`/doctor-patients/${patientId}/reports/${reportId}/url`);
