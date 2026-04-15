// ─────────────────────────────────────────────────────
// Auth Service Routes
//
// Public routes (register/*, login, refresh, logout) are
// forwarded without JWT verification — the client does not
// have a token yet when hitting these endpoints.
//
// Admin routes (/api/auth/admin/*) require a valid JWT with
// role=admin before being forwarded.
//
// NOTE: The guard middleware is registered separately from the
// proxy. router.use('/api/auth/admin', guard) strips the prefix
// inside the guard but RESTORES the full URL before the next
// handler runs, so the proxy always receives the complete path.
// ─────────────────────────────────────────────────────

import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config/index.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Guard admin paths — runs before the proxy, restores full URL on next().
router.use('/api/auth/admin', verifyToken, requireRole('admin'));

// Single proxy for all /api/auth/* — always sees the full original path.
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

router.use(authProxy);

export { router as authRouter };

