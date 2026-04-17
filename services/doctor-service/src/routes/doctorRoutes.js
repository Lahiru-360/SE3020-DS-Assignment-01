// ─────────────────────────────────────────────
// Doctor Routes
//
// POST /profile — INTERNAL only, called by auth-service
//   during the registration flow. Never exposed via
//   the API Gateway.
//
// /internal/* — INTERNAL only, called by auth-service
//   for admin approval/rejection. Protected by the
//   x-internal-secret header. Never exposed via the
//   API Gateway.
// ─────────────────────────────────────────────

import { Router } from "express";
import {
  createProfile,
  updateProfile,
  getOwnProfile,
  getDoctorInternal,
  getPendingDoctors,
  approveDoctor,
  deleteDoctorProfile,
  searchDoctors,
} from "../controllers/doctorController.js";
import {
  createDoctorProfileValidators,
  updateDoctorProfileValidators,
} from "../validators/doctorValidators.js";
import { requireInternalSecret } from "../middleware/internalAuth.js";

const router = Router();

router.post("/profile", createDoctorProfileValidators, createProfile);
router.get("/profile/:userId", getOwnProfile);
router.put("/profile/:userId", updateDoctorProfileValidators, updateProfile);

// ── Internal lookup (appointment-service) ─────────────────────────────────
router.get("/internal/search", requireInternalSecret, searchDoctors);

// ── Admin approval (internal — auth-service only) ─────────────────────────
router.get("/internal/pending", requireInternalSecret, getPendingDoctors);
router.patch("/internal/:userId/approve", requireInternalSecret, approveDoctor);

// ── Internal lookup by userId (keep after static internal routes) ─────────
router.get("/internal/:userId", requireInternalSecret, getDoctorInternal);
router.delete("/internal/:userId", requireInternalSecret, deleteDoctorProfile);

export default router;
