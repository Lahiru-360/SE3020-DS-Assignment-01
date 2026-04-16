/**
 * internalAuth middleware
 *
 * Guards endpoints that should only be reachable from other internal services.
 * The API Gateway NEVER forwards x-internal-secret from external clients.
 */
export const internalAuth = (req, res, next) => {
  const secret = req.headers['x-internal-secret'];

  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: internal access only',
      data: null,
    });
  }

  next();
};
