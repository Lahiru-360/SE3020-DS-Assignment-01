import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config/index.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// All appointment routes require a valid JWT
router.use('/api/appointments', verifyToken);

// ── Role-specific guards ───────────────────────────────────────────────────
// These call next() if authorized, allowing the proxy below to forward the request.
router.get('/api/appointments/doctors/search', requireRole('patient'));
router.post('/api/appointments',              requireRole('patient'));
router.get('/api/appointments/my',           requireRole('patient'));
router.get('/api/appointments/doctor',       requireRole('doctor'));
router.patch('/api/appointments/:id/status', requireRole('doctor'));
router.patch('/api/appointments/:id/cancel', requireRole('patient', 'doctor'));

// ── Proxy ──────────────────────────────────────────────────────────────────
const appointmentProxy = createProxyMiddleware({
  pathFilter: '/api/appointments',
  target: config.APPOINTMENT_SERVICE_URL,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      res.status(502).json({
        success: false,
        message: `Appointment service unavailable: ${err.message}`,
        data: null,
      });
    },
  },
});

router.use(appointmentProxy);

export { router as appointmentRouter };
