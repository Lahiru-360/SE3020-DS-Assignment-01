// ─────────────────────────────────────────────────────
// Doctor Service Routes — API Gateway
// ─────────────────────────────────────────────────────

import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { config } from "../config/index.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";

const router = Router();

// Only authenticated doctors can access the API Gateway doctor endpoints directly.
// (e.g. updating profile). Other endpoints are protected internally.
router.use("/api/doctors", verifyToken, requireRole("doctor"));
router.use("/api/prescriptions", verifyToken);

router.post("/api/prescriptions", requireRole("doctor"));
router.put("/api/prescriptions/:id", requireRole("doctor"));
router.get("/api/prescriptions/doctor/:doctorId", requireRole("doctor"));
router.get(
  "/api/prescriptions/patient/:patientId",
  requireRole("patient", "doctor"),
);
router.get(
  "/api/prescriptions/verify/:id",
  requireRole("patient", "doctor", "admin"),
);
router.get("/api/prescriptions/:id/pdf", requireRole("patient", "doctor"));
router.get("/api/prescriptions/:id", requireRole("patient", "doctor"));

const doctorProxy = createProxyMiddleware({
  pathFilter: "/api/doctors",
  target: config.DOCTOR_SERVICE_URL,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      res.status(502).json({
        success: false,
        message: `Doctor service unavailable: ${err.message}`,
        data: null,
      });
    },
  },
});

const prescriptionProxy = createProxyMiddleware({
  pathFilter: "/api/prescriptions",
  target: config.DOCTOR_SERVICE_URL,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      res.status(502).json({
        success: false,
        message: `Doctor service unavailable: ${err.message}`,
        data: null,
      });
    },
  },
});

router.use(doctorProxy);
router.use(prescriptionProxy);

export { router as doctorRouter };
