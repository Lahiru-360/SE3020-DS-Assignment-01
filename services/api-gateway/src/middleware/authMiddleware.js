// ─────────────────────────────────────────────────────
// AUTH MIDDLEWARE — API Gateway only.
// This is the SINGLE place in the entire system where
// JWT tokens are verified.
// After verification, user info is injected into the
// forwarded request headers so downstream services can
// identify the caller without doing any JWT work.
//
// Downstream services receive:
//   x-user-id    → the authenticated user's MongoDB _id
//   x-user-role  → 'patient' | 'doctor' | 'admin'
//   x-user-email → the authenticated user's email
// ─────────────────────────────────────────────────────

import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
      data: null,
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);

    req.headers['x-user-id']    = decoded.userId;
    req.headers['x-user-role']  = decoded.role;
    req.headers['x-user-email'] = decoded.email;

    next();
  } catch (error) {
    // Do not forward invalid token errors to downstream services
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        data: null,
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      data: null,
    });
  }
};
