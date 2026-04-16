import { Router } from "express";
import {
  createProfile,
  getPatientInternal,
  updateProfile,
} from "../controllers/patientController.js";
import {
  createPatientProfileValidators,
  updatePatientProfileValidators,
} from "../validators/patientValidators.js";
import { requireInternalSecret } from "../middleware/internalAuth.js";

const router = Router();

// ── Internal (auth-service only) ──────────────────────────────────
router.post(
  "/profile",
  requireInternalSecret,
  createPatientProfileValidators,
  createProfile,
);

// ── Internal lookup (appointment-service) ──────────────────────────
router.get("/internal/:userId", requireInternalSecret, getPatientInternal);

// ── Patient-facing (via API Gateway) ──────────────────────────────
router.patch("/me", updatePatientProfileValidators, updateProfile);

export default router;
