import { createHttpError } from "../utils/httpError.js";

export const verifyToken = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  const role = req.headers["x-user-role"];

  if (!userId || !role) {
    return next(createHttpError("Unauthorized", 401));
  }

  req.user = {
    id: userId,
    role: String(role).toUpperCase(),
  };

  next();
};

export const authorizeRoles = (...allowedRoles) => {
  const normalizedAllowedRoles = allowedRoles.map((role) =>
    String(role).toUpperCase(),
  );

  return (req, res, next) => {
    if (!req.user?.role || !normalizedAllowedRoles.includes(req.user.role)) {
      return next(createHttpError("Forbidden: insufficient role", 403));
    }

    next();
  };
};
