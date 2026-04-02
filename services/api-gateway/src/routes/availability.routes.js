// ─────────────────────────────────────────────────────
// Availability Service Routes — API Gateway
// ─────────────────────────────────────────────────────

import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { config } from "../config/index.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";

const router = Router();

// Define proxy middleware rules
const availabilityProxy = createProxyMiddleware({
  pathFilter: "/api/availability",
  target: config.DOCTOR_SERVICE_URL,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      res.status(502).json({
        success: false,
        message: `Doctor service unavailable for availability endpoint: ${err.message}`,
        data: null,
      });
    },
  },
});

// Since Patients need to READ availability but only Doctors can EDIT them,
// We attach the JWT verifier to make sure someone is logged in:
router.use("/api/availability", verifyToken);

// Only doctors can POST, PUT, DELETE
router.post("/api/availability", requireRole("doctor"));
router.put("/api/availability/*", requireRole("doctor"));
router.delete("/api/availability/*", requireRole("doctor"));

// All routes go through the proxy after security checks
router.use(availabilityProxy);

export { router as availabilityRouter };
