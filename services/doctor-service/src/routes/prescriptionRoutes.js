import { Router } from "express";
import {
  createPrescription,
  generatePrescriptionPdf,
  getPrescriptionById,
  getPrescriptionsByDoctorId,
  getPrescriptionsByPatientId,
  updatePrescription,
  verifyPrescription,
} from "../controllers/prescriptionController.js";
import {
  createPrescriptionValidators,
  doctorIdParamValidator,
  patientIdParamValidator,
  prescriptionIdParamValidator,
  updatePrescriptionValidators,
} from "../validators/prescriptionValidators.js";
import { authorizeRoles, verifyToken } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", createPrescriptionValidators, createPrescription);
router.put("/:id", updatePrescriptionValidators, updatePrescription);

router.get(
  "/patient/:patientId",
  patientIdParamValidator,
  getPrescriptionsByPatientId,
);
router.get(
  "/doctor/:doctorId",
  doctorIdParamValidator,
  getPrescriptionsByDoctorId,
);
router.get("/verify/:id", prescriptionIdParamValidator, verifyPrescription);
router.get(
  "/:id/pdf",
  verifyToken,
  authorizeRoles("DOCTOR", "PATIENT"),
  prescriptionIdParamValidator,
  generatePrescriptionPdf,
);
router.get(
  "/:id",
  verifyToken,
  authorizeRoles("DOCTOR", "PATIENT"),
  prescriptionIdParamValidator,
  getPrescriptionById,
);

export default router;
