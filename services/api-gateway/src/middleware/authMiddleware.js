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

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.headers['x-user-role'])) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: insufficient role',
      data: null,
    });
  }
  next();
};

