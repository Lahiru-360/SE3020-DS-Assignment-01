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

// ── Guard payment paths — runs before the proxy, preserves full URL ───────────
// We apply verifyToken to all /api/payments/* EXCEPT the /webhook route.
router.use('/api/payments', (req, res, next) => {
  // express.router.use strips the prefix inside the handler, so req.path 
  // is just the portion after '/api/payments'.
  if (req.path === '/webhook') return next();
  verifyToken(req, res, next);
});

// Single proxy for all /api/payments/* — always sees the full original path.
router.use(paymentProxy);

export { router as paymentRouter };
