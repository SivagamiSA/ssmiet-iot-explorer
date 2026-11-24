import { Router } from "express";
import { z } from "zod";
import { Project, StudentProgress } from "../../models/index.js";
import { requirePermission } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../utils/errors.js";
import { logAudit } from "../../utils/audit.js";
import { escapeRegex, searchText, pageOf, pagesOf, label } from "./helpers.js";

// Phase 4: manage the existing projects (the same `projects` collection students read from; students see only "approved").
// No delete: student progress is saved against the slug, so a project is hidden by setting it back to "pending".
// Simulation content is NOT touched here (separate, later module).
const router = Router();

const image = z.string().trim().max(200).refine((v) => v === "" || (/^\/[A-Za-z0-9_\-./]+$/.test(v) && !v.includes("..")), "Use a path starting with / such as /images/projects/led-blinking.jpg");
const fields = {
  title: label("Title", 2, 120),
  summary: label("Summary", 2, 400),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  image,
  order: z.coerce.number().int().min(0).max(9999),
  status: z.enum(["pending", "approved"]),
};
const createSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens, e.g. led-blinking").max(60),
  ...fields,
}).partial({ difficulty: true, image: true, order: true, status: true }).strict();
const patchSchema = z.object(fields).partial().strict(); // slug can never change

const row = (p, sim) => ({ id: p._id, slug: p.slug, title: p.title, summary: p.summary, difficulty: p.difficulty, image: p.image, order: p.order, status: p.status, updatedAt: p.updatedAt, simulation: sim ?? { students: 0, attempts: 0, completed: 0 } });

const simStats = async (slugs) => {
  if (!slugs.length) return new Map();
  const rows = await StudentProgress.aggregate([
    { $unwind: "$simulations" }, { $match: { "simulations.projectSlug": { $in: slugs } } },
    { $group: { _id: "$simulations.projectSlug", students: { $sum: 1 }, attempts: { $sum: "$simulations.attempts" }, completed: { $sum: { $cond: ["$simulations.completed", 1, 0] } } } },
  ]);
  return new Map(rows.map((r) => [r._id, { students: r.students, attempts: r.attempts, completed: r.completed }]));
};

router.get("/projects", requirePermission("projects.view"), asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageOf(req.query);
  const filter = {};
  const q = searchText(req.query.q);
  if (q) { const rx = new RegExp(escapeRegex(q), "i"); filter.$or = [{ title: rx }, { slug: rx }, { summary: rx }]; }
  if (["pending", "approved"].includes(req.query.status)) filter.status = req.query.status;
  if (["Beginner", "Intermediate", "Advanced"].includes(req.query.difficulty)) filter.difficulty = req.query.difficulty;
  const [items, total] = await Promise.all([Project.find(filter).sort({ order: 1, createdAt: 1 }).skip(skip).limit(limit).lean(), Project.countDocuments(filter)]);
  const stats = await simStats(items.map((p) => p.slug));
  res.json({ page, limit, total, pages: pagesOf(total, limit), items: items.map((p) => row(p, stats.get(p.slug))) });
}));

router.get("/projects/:slug", requirePermission("projects.view"), asyncHandler(async (req, res) => {
  const p = await Project.findOne({ slug: String(req.params.slug).toLowerCase() }).lean();
  if (!p) throw new HttpError(404, "Project not found.");
  res.json({ project: row(p, (await simStats([p.slug])).get(p.slug)) });
}));

router.post("/projects", requirePermission("projects.manage"), asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  if (await Project.exists({ slug: data.slug })) throw new HttpError(409, "A project with this slug already exists.", { slug: "A project with this slug already exists." });
  const p = await Project.create({ ...data, status: data.status ?? "pending" }); // new projects start hidden unless approved on purpose
  await logAudit(req, { action: "project.create", targetType: "project", targetId: p.slug, summary: `Added project "${p.title}" (${p.status}).` });
  res.status(201).json({ project: row(p.toObject()) });
}));

router.patch("/projects/:slug", requirePermission("projects.manage"), asyncHandler(async (req, res) => {
  const data = patchSchema.parse(req.body);
  const p = await Project.findOne({ slug: String(req.params.slug).toLowerCase() });
  if (!p) throw new HttpError(404, "Project not found.");
  const keys = Object.keys(data);
  for (const k of keys) p[k] = data[k];
  await p.save();
  if (keys.length) await logAudit(req, { action: data.status && keys.length === 1 ? `project.${data.status}` : "project.update", targetType: "project", targetId: p.slug, summary: `Updated "${p.title}": ${keys.join(", ")}.` });
  res.json({ project: row(p.toObject()) });
}));

export default router;
