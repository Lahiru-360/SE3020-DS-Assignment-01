import { validationResult } from "express-validator";
import {
  listMedicalReportsForDoctorService,
  getSignedUrlForDoctorService,
} from "../services/doctorMedicalReportService.js";
import { sendSuccess, sendError } from "../utils/responseHelper.js";

/**
 * GET /api/doctor-patients/:patientId/reports
 * Lists all medical reports for a patient — only if the requesting doctor
 * has at least one appointment (any status except cancelled) with that patient.
 */
export const listReportsForDoctor = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const doctorId = req.headers["x-user-id"];
    if (!doctorId) return sendError(res, "Unauthorized", 401);

    const { patientId } = req.params;

    const reports = await listMedicalReportsForDoctorService(
      doctorId,
      patientId,
    );
    return sendSuccess(
      res,
      reports,
      "Medical reports fetched successfully",
      200,
    );
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/doctor-patients/:patientId/reports/:reportId/url
 * Returns a short-lived signed URL for a specific report — same access check.
 */
export const getReportSignedUrlForDoctor = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const doctorId = req.headers["x-user-id"];
    if (!doctorId) return sendError(res, "Unauthorized", 401);

    const { patientId, reportId } = req.params;

    const result = await getSignedUrlForDoctorService(
      doctorId,
      patientId,
      reportId,
    );
    return sendSuccess(res, result, "Signed URL generated", 200);
  } catch (e) {
    next(e);
  }
};
