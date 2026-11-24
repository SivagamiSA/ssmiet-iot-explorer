import { Student, Admin } from "../models/index.js";
import { verifyToken } from "../utils/token.js";
import { HttpError, asyncHandler } from "../utils/errors.js";
import { hasPermission, isSuperAdmin } from "../utils/permissions.js";

const MODELS = { student: Student, admin: Admin };

/** Requires a valid `Authorization: Bearer <token>` and that the account still exists and is active. */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) throw new HttpError(401, "Please log in to continue.");

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new HttpError(401, "Your session has expired. Please log in again.");
  }

  const Model = MODELS[payload.role];
  const user = Model ? await Model.findById(payload.sub) : null;
  if (!user || !user.isActive) throw new HttpError(401, "Your session is no longer valid. Please log in again.");

  req.user = user;
  next();
});

/** Use after `authenticate`: requireRole("admin") */
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new HttpError(403, "You do not have permission to access this."));
  }
  next();
};

/** Admin Portal: use after `authenticate`. requirePermission("students.view") (every listed permission is required). */
export const requirePermission = (...permissions) => (req, _res, next) => {
  if (req.user?.role !== "admin" || !permissions.every((p) => hasPermission(req.user, p))) {
    return next(new HttpError(403, "You do not have permission to do this."));
  }
  next();
};

/** Admin Portal: use after `authenticate`. Only the Super Admin passes. */
export const requireSuperAdmin = (req, _res, next) => {
  if (req.user?.role !== "admin" || !isSuperAdmin(req.user)) {
    return next(new HttpError(403, "Only the Super Admin can do this."));
  }
  next();
};
