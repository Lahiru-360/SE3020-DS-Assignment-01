export const requireInternalSecret = (req, res, next) => {
  if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SECRET) {
    return res.status(403).json({ success: false, message: 'Forbidden', data: null });
  }
  next();
};
