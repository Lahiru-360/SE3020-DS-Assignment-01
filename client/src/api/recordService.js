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
 * Get a short-lived Supabase signed URL for a specific record.
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
