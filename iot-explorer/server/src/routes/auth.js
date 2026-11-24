import { Router } from "express";
import rateLimit from "express-rate-limit";
import { Student, Admin, School } from "../models/index.js";
import { nameKeyOf } from "../models/School.js";
import { hashPassword, checkPassword, burnTime } from "../utils/password.js";
import { signToken } from "../utils/token.js";
import { HttpError, asyncHandler } from "../utils/errors.js";
import { studentRegisterSchema, studentLoginSchema, adminLoginSchema } from "../utils/validation.js";
import { authenticate } from "../middleware/auth.js";
import { effectivePermissions } from "../utils/permissions.js";
import { logAudit } from "../utils/audit.js";
import { getPlatformSettings } from "../utils/settings.js";

const router = Router();

// A whole college lab can share one public IP, so limits are generous and failed logins are what count.
const limiter = (max, windowMinutes) => rateLimit({
  windowMs: windowMinutes * 60 * 1000, max, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
});
const loginLimiter = limiter(30, 15);
const registerLimiter = limiter(100, 60);

const publicStudent = (s) => ({ id: s._id, role: "student", name: s.name, schoolName: s.schoolName, standard: s.standard, email: s.email });
const publicAdmin = (a, lastLoginAt) => ({
  id: a._id, role: "admin", name: a.name, email: a.email,
  adminRole: a.adminRole ?? "admin", permissions: effectivePermissions(a), lastLoginAt: lastLoginAt ?? a.lastLoginAt ?? null,
});
const publicUser = (u) => (u.role === "admin" ? publicAdmin(u) : publicStudent(u));

const BAD_LOGIN = "Incorrect email or password.";

// POST /api/auth/student/register
router.post("/student/register", registerLimiter, asyncHandler(async (req, res) => {
  const data = studentRegisterSchema.parse(req.body);
  if (!(await getPlatformSettings()).registrationOpen) throw new HttpError(403, "New registrations are paused right now. Please contact your coordinator.");
  if (await Student.exists({ email: data.email })) {
    throw new HttpError(409, "An account with this email already exists.", { email: "This email address is already registered." });
  }

  // Only the bcrypt hash is stored. The plain password and confirmPassword are never saved.
  // Link to an existing school record when the typed name matches one (admins manage the school list).
  const school = await School.findOne({ nameKey: nameKeyOf(data.schoolName) }).select("_id");
  const student = await Student.create({
    name: data.name, schoolName: data.schoolName, schoolId: school?._id ?? null, standard: data.standard,
    email: data.email, passwordHash: await hashPassword(data.password),
  });
  res.status(201).json({ message: "Registration successful. You can now log in.", user: publicStudent(student) });
}));

// POST /api/auth/student/login   (email + password)
router.post("/student/login", loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = studentLoginSchema.parse(req.body);
  const student = await Student.findOne({ email }).select("+passwordHash");
  if (!student) { await burnTime(password); throw new HttpError(401, BAD_LOGIN); }
  if (!(await checkPassword(password, student.passwordHash))) throw new HttpError(401, BAD_LOGIN);
  if (!student.isActive) throw new HttpError(403, "This account has been disabled. Contact your coordinator.");
  res.json({ token: signToken(student), user: publicStudent(student) });
}));

// POST /api/auth/admin/login
router.post("/admin/login", loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = adminLoginSchema.parse(req.body);
  const admin = await Admin.findOne({ email }).select("+passwordHash");
  if (!admin) {
    await burnTime(password);
    await logAudit(req, { action: "admin.login_failed", actorEmail: email, summary: "Unknown admin email." });
    throw new HttpError(401, BAD_LOGIN);
  }
  if (!(await checkPassword(password, admin.passwordHash))) {
    await logAudit(req, { action: "admin.login_failed", actor: admin, summary: "Wrong password." });
    throw new HttpError(401, BAD_LOGIN);
  }
  if (!admin.isActive) {
    await logAudit(req, { action: "admin.login_blocked", actor: admin, summary: "Disabled account." });
    throw new HttpError(403, "This account has been disabled.");
  }
  const previousLogin = admin.lastLoginAt ?? null; // shown on the dashboard as "last login"
  await Admin.updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date() } });
  await logAudit(req, { action: "admin.login", actor: admin, targetType: "admin", targetId: admin._id, summary: "Admin logged in." });
  res.json({ token: signToken(admin), user: publicAdmin(admin, previousLogin) });
}));

// GET /api/auth/me  (any logged-in user; the frontend uses it to restore a session)
router.get("/me", authenticate, (req, res) => res.json({ user: publicUser(req.user) }));

export default router;
