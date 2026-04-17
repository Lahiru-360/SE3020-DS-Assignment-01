import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { config } from "../config/index.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";

const router = Router();

// Guard: all /api/patients/* patient-facing routes require a valid patient JWT.
router.use("/api/patients", verifyToken, requireRole("patient"));

// Guard: doctor access to a patient's medical records.
router.use("/api/doctor-patients", verifyToken, requireRole("doctor"));

const patientProxy = createProxyMiddleware({
  pathFilter: ["/api/patients", "/api/doctor-patients"],
  target: config.PATIENT_SERVICE_URL,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      res.status(502).json({
        success: false,
        message: `Patient service unavailable: ${err.message}`,
        data: null,
      });
    },
  },
});

router.use(patientProxy);

export { router as patientRouter };
