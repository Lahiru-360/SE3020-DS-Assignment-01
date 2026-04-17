import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config/index.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// All telemedicine routes require a valid JWT
router.use('/api/telemedicine', verifyToken);

// ── Role-specific guards ───────────────────────────────────────────────────
router.get('/api/telemedicine/sessions/:appointmentId',      requireRole('patient', 'doctor'));
router.post('/api/telemedicine/sessions/:appointmentId/end', requireRole('doctor'));

// ── Proxy ──────────────────────────────────────────────────────────────────
const telemedicineProxy = createProxyMiddleware({
  pathFilter: '/api/telemedicine',
  target: config.TELEMEDICINE_SERVICE_URL,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      res.status(502).json({
        success: false,
        message: `Telemedicine service unavailable: ${err.message}`,
        data: null,
      });
    },
  },
});

router.use(telemedicineProxy);

export { router as telemedicineRouter };
