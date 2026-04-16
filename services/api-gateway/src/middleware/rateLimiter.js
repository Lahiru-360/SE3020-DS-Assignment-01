import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV === 'development';

// General limiter — applied to all routes except health probes.
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10000 : 1000,
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
  max: isDev ? 500 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    data: null,
  },
});
