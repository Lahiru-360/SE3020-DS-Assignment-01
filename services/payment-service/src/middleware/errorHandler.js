import { HttpError } from '../utils/httpError.js';
import { sendError } from '../utils/responseHelper.js';

export const errorHandler = (err, req, res, next) => {
  if (err instanceof HttpError) {
    return sendError(res, err.message, err.statusCode);
  }

  console.error('Unhandled error:', err);
  return sendError(res, 'Internal server error', 500);
};
