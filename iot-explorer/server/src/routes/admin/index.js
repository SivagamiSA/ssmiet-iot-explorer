import { Router } from "express";
import { z } from "zod";
import { Admin, Student, Project, Event, AuditLog } from "../../models/index.js";
import { authenticate, requireRole, requirePermission } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/errors.js";
import peopleRoutes from "./people.js";
import componentRoutes from "./components.js";
import projectRoutes from "./projects.js";
import reportRoutes from "./reports.js";
import securityRoutes from "./security.js";
import { effectivePermissions, hasPermission, isSuperAdmin } from "../../utils/permissions.js";

// Admin Portal API. Every route below needs a logged-in ADMIN; each module adds its own permission check.
// (The old GET /api/admin/ping in roleChecks.js keeps working and is mounted before this router.)
const router = Router();
router.use(authenticate, requireRole("admin"));

router.use(peopleRoutes); // Phase 2: students + schools
router.use(componentRoutes); // Phase 3: components
router.use(projectRoutes); // Phase 4: projects
router.use(reportRoutes); // Phase 8: reports
router.use(securityRoutes); // Phase 9: admin accounts, password, settings

const me = (a) => ({ id: a._id, name: a.name, email: a.email, adminRole: a.adminRole ?? "admin", permissions: effectivePermissions(a), lastLoginAt: a.lastLoginAt ?? null });

// GET /api/admin/me -> who am I and what may I do (fresh from the database, not from the token)
router.get("/me", (req, res) => res.json({ admin: me(req.user) }));

// GET /api/admin/dashboard -> read-only counts. A section is only included when this admin may view that module.
router.get("/dashboard", asyncHandler(async (req, res) => {
  const can = (p) => hasPermission(req.user, p);
  const jobs = {};

  if (can("students.view")) {
    jobs.students = Promise.all([Student.countDocuments({}), Student.countDocuments({ isActive: true })])
      .then(([total, active]) => ({ total, active }));
  }
  if (can("projects.view")) {
    jobs.projects = Promise.all([Project.countDocuments({}), Project.countDocuments({ status: "approved" }), Project.countDocuments({ status: "pending" })])
      .then(([total, approved, pending]) => ({ total, approved, pending }));
  }
  if (can("events.view")) {
    jobs.events = Promise.all([Event.countDocuments({}), Event.countDocuments({ status: "published" }), Event.countDocuments({ status: "draft" })])
      .then(([total, published, draft]) => ({ total, published, draft }));
  }
  if (isSuperAdmin(req.user)) {
    jobs.admins = Promise.all([Admin.countDocuments({}), Admin.countDocuments({ isActive: true }), Admin.countDocuments({ adminRole: "super_admin" })])
      .then(([total, active, superAdmins]) => ({ total, active, superAdmins }));
  }
  if (can("audit.view")) {
    jobs.recentActivity = AuditLog.find({}).sort({ createdAt: -1 }).limit(8).lean()
      .then((rows) => rows.map((r) => ({ id: r._id, action: r.action, actorEmail: r.actorEmail, summary: r.summary, createdAt: r.createdAt })));
  }

  const entries = await Promise.all(Object.entries(jobs).map(async ([k, p]) => [k, await p]));
  res.json({ admin: me(req.user), ...Object.fromEntries(entries), generatedAt: new Date() });
}));

// GET /api/admin/audit-log?page=1&limit=25 -> newest first (needs audit.view). The page for it arrives in a later phase.
const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
router.get("/audit-log", requirePermission("audit.view"), asyncHandler(async (req, res) => {
  const { page, limit } = pageQuery.parse(req.query);
  const [total, rows] = await Promise.all([
    AuditLog.countDocuments({}),
    AuditLog.find({}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  res.json({
    page, limit, total,
    items: rows.map((r) => ({ id: r._id, action: r.action, actorEmail: r.actorEmail, actorRole: r.actorRole, targetType: r.targetType, targetId: r.targetId, summary: r.summary, createdAt: r.createdAt })),
  });
}));

export default router;
