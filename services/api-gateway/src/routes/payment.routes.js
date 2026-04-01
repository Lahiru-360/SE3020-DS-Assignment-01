// ─────────────────────────────────────────────────────
// Payment Service Routes — API Gateway proxy
//
// All /api/payments/* routes EXCEPT /webhook require
// a valid JWT — verifyToken is applied before the proxy.
//
// /webhook is called directly by Stripe servers, not by
// the frontend. Stripe's own signature verification (in
// payment-service) provides the security for that route.
// We still proxy it through the gateway so Stripe only
// needs one public URL, but we skip JWT verification.
// ─────────────────────────────────────────────────────

import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config/index.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = Router();

// Proxy factory — reused for both protected and webhook routes.
const paymentProxy = createProxyMiddleware({
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

// ── Stripe Webhook — NO JWT (Stripe calls this, not the browser) ──────────
router.post('/api/payments/webhook', paymentProxy);

// ── All other payment routes — JWT REQUIRED ───────────────────────────────
router.use('/api/payments', verifyToken, paymentProxy);

export { router as paymentRouter };
