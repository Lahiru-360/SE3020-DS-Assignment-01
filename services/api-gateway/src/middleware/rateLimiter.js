import rateLimit from 'express-rate-limit';

// General limiter — applied to all routes except health probes.
// Keep the ceiling high enough for normal multi-service page loads.
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    data: null,
  },
});

// Tighter limiter for sensitive auth endpoints (login, register, password reset).
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    data: null,
  },
});
