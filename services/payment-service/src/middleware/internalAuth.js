import { createHttpError } from '../utils/httpError.js';

export const internalAuth = (req, res, next) => {
  const secret = req.get('x-internal-secret');
  if (secret !== process.env.INTERNAL_SECRET) {
    throw createHttpError('Unauthorized internal request', 401);
  }
  next();
};
