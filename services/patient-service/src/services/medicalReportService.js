import { randomUUID } from "crypto";
import path from "path";
import { supabase } from "../config/supabase.js";
import {
  createReport,
  findReportsByPatientId,
  findReportById,
  deleteReportById,
} from "../repositories/medicalReportRepository.js";
import { createHttpError } from "../utils/httpError.js";

const BUCKET = "medical-reports";

// Signed URLs expire after 1 hour
const SIGNED_URL_EXPIRY_SECONDS = 3600;

//  Upload

export const uploadMedicalReportService = async ({
  file,
  patientId,
  description,
}) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const storagePath = `${patientId}/${randomUUID()}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    throw createHttpError(`Storage upload failed: ${uploadError.message}`, 502);
  }

  const report = await createReport({
    patientId,
    filePath: storagePath,
    fileName: file.originalname,
    fileType: file.mimetype,
    fileSize: file.size,
    description: description?.trim() || null,
  });

  return report;
};

// List

export const listMedicalReportsService = async (patientId) => {
  return findReportsByPatientId(patientId);
};

// Signed URL

export const getSignedUrlService = async (patientId, reportId) => {
  const report = await findReportById(reportId);
  if (!report) throw createHttpError("Report not found", 404);
  if (report.patientId !== patientId) throw createHttpError("Forbidden", 403);

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

// Delete

export const deleteMedicalReportService = async (patientId, reportId) => {
  const report = await findReportById(reportId);
  if (!report) throw createHttpError("Report not found", 404);
  if (report.patientId !== patientId) throw createHttpError("Forbidden", 403);

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([report.filePath]);

  if (storageError) {
    throw createHttpError(
      `Storage deletion failed: ${storageError.message}`,
      502,
    );
  }

  await deleteReportById(reportId);
};
