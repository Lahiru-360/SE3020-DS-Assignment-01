import { validationResult } from "express-validator";
import {
  createPrescriptionService,
  generatePrescriptionPdfForUserService,
  getPrescriptionByIdForUserService,
  getPrescriptionsByDoctorIdService,
  getPrescriptionsByPatientIdService,
  updatePrescriptionService,
  verifyPrescriptionService,
} from "../services/prescriptionService.js";
import { sendError, sendSuccess } from "../utils/responseHelper.js";

export const createPrescription = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const prescription = await createPrescriptionService(req.body);
    return sendSuccess(
      res,
      prescription,
      "Prescription created successfully",
      201,
    );
  } catch (error) {
    next(error);
  }
};

export const updatePrescription = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const prescription = await updatePrescriptionService(
      req.params.id,
      req.body,
    );
    return sendSuccess(res, prescription, "Prescription updated successfully");
  } catch (error) {
    next(error);
  }
};

export const getPrescriptionById = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const prescription = await getPrescriptionByIdForUserService(
      req.params.id,
      req.user.id,
    );
    return sendSuccess(res, prescription, "Prescription fetched successfully");
  } catch (error) {
    next(error);
  }
};

export const getPrescriptionsByPatientId = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const prescriptions = await getPrescriptionsByPatientIdService(
      req.params.patientId,
    );
    return sendSuccess(
      res,
      prescriptions,
      "Patient prescriptions fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

export const getPrescriptionsByDoctorId = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const prescriptions = await getPrescriptionsByDoctorIdService(
      req.params.doctorId,
    );
    return sendSuccess(
      res,
      prescriptions,
      "Doctor prescriptions fetched successfully",
    );
  } catch (error) {
    next(error);
  }
};

export const verifyPrescription = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const prescription = await verifyPrescriptionService(req.params.id);
    return sendSuccess(res, prescription, "Prescription verified successfully");
  } catch (error) {
    next(error);
  }
};

export const generatePrescriptionPdf = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, errors.array()[0].msg, 422);

    const { buffer, prescription } =
      await generatePrescriptionPdfForUserService(req.params.id, req.user.id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=prescription-${prescription._id}.pdf`,
    );
    return res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
};
