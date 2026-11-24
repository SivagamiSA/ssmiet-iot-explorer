import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { Admin, Setting } from "../../models/index.js";
import { requireSuperAdmin } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../utils/errors.js";
import { logAudit } from "../../utils/audit.js";
import { hashPassword, checkPassword } from "../../utils/password.js";
import { newPassword } from "../../utils/validation.js";
import { ADMIN_ROLES, PERMISSIONS, MODULE_ACTIONS, effectivePermissions, isSuperAdmin } from "../../utils/permissions.js";
import { getPlatformSettings } from "../../utils/settings.js";
import { idOr404 } from "./helpers.js";

// Phase 9: admin accounts & permissions (Super Admin only), change own password, platform settings.
// Admin accounts are still CREATED only with `npm run create-admin`; this only manages existing ones.
const router = Router();

const publicAdmin = (a) => ({ id: a._id, name: a.name, email: a.email, adminRole: a.adminRole ?? "admin", permissions: effectivePermissions(a), isActive: a.isActive, lastLoginAt: a.lastLoginAt ?? null, createdAt: a.createdAt });

router.get("/admin-accounts", requireSuperAdmin, asyncHandler(async (_req, res) => {
  const admins = await Admin.find({}).sort({ createdAt: 1 }).lean();
  res.json({ items: admins.map(publicAdmin), modules: MODULE_ACTIONS });
}));

const accountPatch = z.object({
  adminRole: z.enum(ADMIN_ROLES),
  isActive: z.boolean(),
  permissions: z.array(z.enum(PERMISSIONS)).max(PERMISSIONS.length),
}).partial().strict();

router.patch("/admin-accounts/:id", requireSuperAdmin, asyncHandler(async (req, res) => {
  const data = accountPatch.parse(req.body);
  const target = await Admin.findById(idOr404(req.params.id, "Admin"));
  if (!target) throw new HttpError(404, "Admin not found.");
  const self = String(target._id) === String(req.user._id);

  const losesSuper = isSuperAdmin(target) && ((data.adminRole && data.adminRole !== "super_admin") || data.isActive === false);
  if (losesSuper) {
    if (self) throw new HttpError(400, "You cannot demote or deactivate your own Super Admin account.");
    const others = await Admin.countDocuments({ adminRole: "super_admin", isActive: true, _id: { $ne: target._id } });
    if (others < 1) throw new HttpError(400, "At least one active Super Admin must remain.");
  }
  if (self && data.isActive === false) throw new HttpError(400, "You cannot deactivate your own account.");

  const changed = [];
  if (data.adminRole !== undefined && data.adminRole !== target.adminRole) { target.adminRole = data.adminRole; changed.push(`role -> ${data.adminRole}`); }
  if (data.isActive !== undefined && data.isActive !== target.isActive) { target.isActive = data.isActive; changed.push(data.isActive ? "activated" : "deactivated"); }
  if (data.permissions !== undefined) { target.permissions = [...new Set(data.permissions)]; changed.push("permissions"); }
  await target.save();
  if (changed.length) await logAudit(req, { action: "admin.update", targetType: "admin", targetId: target._id, summary: `Updated ${target.email}: ${changed.join(", ")}.` });
  res.json({ admin: publicAdmin(target) });
}));

// ---- change my own password (any admin) ----
const pwLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true, message: { message: "Too many attempts. Please wait a few minutes and try again." } });
const pwBody = z.object({
  currentPassword: z.string({ required_error: "Current password is required" }).min(1, "Current password is required").max(200),
  newPassword,
  confirmPassword: z.string({ required_error: "Confirm your new password" }).min(1, "Confirm your new password"),
}).refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

router.post("/me/password", pwLimiter, asyncHandler(async (req, res) => {
  const data = pwBody.parse(req.body);
  const admin = await Admin.findById(req.user._id).select("+passwordHash");
  if (!admin || !(await checkPassword(data.currentPassword, admin.passwordHash))) {
    await logAudit(req, { action: "admin.password_change_failed", summary: "Wrong current password." });
    throw new HttpError(400, "Your current password is incorrect.", { currentPassword: "Your current password is incorrect." });
  }
  if (await checkPassword(data.newPassword, admin.passwordHash)) throw new HttpError(400, "Choose a password different from the current one.", { newPassword: "Choose a password different from the current one." });
  admin.passwordHash = await hashPassword(data.newPassword);
  await admin.save();
  await logAudit(req, { action: "admin.password_changed", targetType: "admin", targetId: admin._id, summary: "Admin changed their own password." });
  res.json({ ok: true });
}));

// ---- platform settings (Super Admin) ----
router.get("/settings", requireSuperAdmin, asyncHandler(async (_req, res) => res.json({ settings: await getPlatformSettings() })));

router.patch("/settings", requireSuperAdmin, asyncHandler(async (req, res) => {
  const data = z.object({ registrationOpen: z.boolean() }).partial().strict().parse(req.body);
  if (Object.keys(data).length) {
    await Setting.updateOne({ key: "platform" }, { $set: { ...data, updatedBy: req.user.email }, $setOnInsert: { key: "platform" } }, { upsert: true });
    await logAudit(req, { action: "settings.update", targetType: "settings", targetId: "platform", summary: `Student registration ${data.registrationOpen ? "opened" : "paused"}.` });
  }
  res.json({ settings: await getPlatformSettings() });
}));

export default router;
