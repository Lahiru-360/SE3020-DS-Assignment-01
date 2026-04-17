import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config/index.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Tighter rate limit on auth paths (login, register, password reset).
router.use('/api/auth', authRateLimiter);

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

