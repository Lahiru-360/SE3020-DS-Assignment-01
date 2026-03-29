/**
 * internalAuth middleware
 *
 * Guards endpoints that should only be reachable from other internal services.
 * Any service making an internal call must include the header:
 *   "internal-secret": <INTERNAL_SECRET from env>
 */
export const internalAuth = (req, res, next) => {
  const secret = req.headers['internal-secret'];

  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: internal access only',
      data: null,
    });
  }

  next();
};
