import { validationResult } from "express-validator";
import {
  uploadMedicalReportService,
  listMedicalReportsService,
  getSignedUrlService,
  deleteMedicalReportService,
} from "../services/medicalReportService.js";
import { sendSuccess, sendError } from "../utils/responseHelper.js";

export const uploadReport = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const patientId = req.headers["x-user-id"];
    if (!patientId) return sendError(res, "Unauthorized", 401);

    if (!req.file) return sendError(res, "No file provided", 422);

    const { description } = req.body;
    const report = await uploadMedicalReportService({
      file: req.file,
      patientId,
      description,
    });

    return sendSuccess(
      res,
      report,
      "Medical report uploaded successfully",
      201,
    );
  } catch (e) {
    next(e);
  }
};

export const listReports = async (req, res, next) => {
  try {
    const patientId = req.headers["x-user-id"];
    if (!patientId) return sendError(res, "Unauthorized", 401);

    const reports = await listMedicalReportsService(patientId);
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

export const getReportSignedUrl = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const patientId = req.headers["x-user-id"];
    if (!patientId) return sendError(res, "Unauthorized", 401);

    const { reportId } = req.params;
    const result = await getSignedUrlService(patientId, reportId);

    return sendSuccess(res, result, "Signed URL generated", 200);
  } catch (e) {
    next(e);
  }
};

export const deleteReport = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const patientId = req.headers["x-user-id"];
    if (!patientId) return sendError(res, "Unauthorized", 401);

    const { reportId } = req.params;
    await deleteMedicalReportService(patientId, reportId);

    return sendSuccess(res, null, "Medical report deleted successfully", 200);
  } catch (e) {
    next(e);
  }
};
