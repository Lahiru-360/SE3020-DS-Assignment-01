// ─────────────────────────────────────────────────────────────────────────────
// Payment Service Routes — API Gateway
//
// Routes and their requirements:
//   POST /api/payments/create-intent → patient only (JWT required)
//   POST /api/payments/webhook       → NO JWT (Stripe calls this directly)
//   GET  /api/payments/my            → patient only (JWT required)
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config/index.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// ── Proxy definition ───────────────────────────────────────────────────────
const paymentProxy = createProxyMiddleware({
  pathFilter: '/api/payments',
  target: config.PAYMENT_SERVICE_URL,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      res.status(502).json({
        success: false,
        message: `Payment service unavailable: ${err.message}`,
        data: null,
      });
    },
  },
});

// ── Webhook route — NO JWT, called directly by Stripe servers ─────────────
// Must be declared before the verifyToken middleware below
router.post('/api/payments/webhook',
  createProxyMiddleware({
    pathFilter: '/api/payments/webhook',
    target: config.PAYMENT_SERVICE_URL,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        res.status(502).json({
          success: false,
          message: `Payment service unavailable: ${err.message}`,
          data: null,
        });
      },
    },
  })
);

// ── All other payment routes require a valid JWT ───────────────────────────
router.use('/api/payments', verifyToken);

// ── Role-specific guards ───────────────────────────────────────────────────
// These call next() if authorized, allowing the proxy below to forward the request.
router.post('/api/payments/create-intent', requireRole('patient'));
router.get('/api/payments/my',             requireRole('patient'));
router.post('/api/payments/refund/:id',    requireRole('admin'));

// ── Block access to internal-only routes from the outside ──────────────────
router.all('/api/payments/internal*', (req, res) => {
  res.status(403).json({ success: false, message: 'Forbidden: Internal access only', data: null });
});

router.use(paymentProxy);

export { router as paymentRouter };
