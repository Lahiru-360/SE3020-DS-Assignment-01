import { Router } from "express";
import {
  listReportsForDoctor,
  getReportSignedUrlForDoctor,
} from "../controllers/doctorMedicalReportController.js";
import { reportIdParamValidator } from "../validators/medicalReportValidators.js";
import { param } from "express-validator";

const router = Router();

// GET  /api/doctor-patients/:patientId/reports
// GET  /api/doctor-patients/:patientId/reports/:reportId/url
// Both require role=doctor (enforced at gateway) + an existing appointment
// between the doctor and that patient.

const patientIdValidator = [
  param("patientId").notEmpty().withMessage("patientId is required"),
];

router.get("/:patientId/reports", patientIdValidator, listReportsForDoctor);

router.get(
  "/:patientId/reports/:reportId/url",
  [...patientIdValidator, ...reportIdParamValidator],
  getReportSignedUrlForDoctor,
);

export default router;
