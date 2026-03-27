// ─────────────────────────────────────────────────────
// Auth Service Routes
//
// All /api/auth/* routes are PUBLIC — they are
// whitelisted by the gateway because the client does
// not have a token yet when hitting these endpoints.
// verifyToken is intentionally NOT applied here.
// ─────────────────────────────────────────────────────

import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config/index.js';

const router = Router();

const authProxy = createProxyMiddleware({
  pathFilter: '/api/auth', 
  target: config.AUTH_SERVICE_URL,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      res.status(502).json({
        success: false,
        message: `Auth service unavailable: ${err.message}`,
        data: null,
      });
    },
  },
});

// PUBLIC — no verifyToken middleware on any of these
router.use(authProxy);

export { router as authRouter };
