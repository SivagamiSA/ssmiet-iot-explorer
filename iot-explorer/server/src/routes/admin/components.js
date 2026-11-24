import { Router } from "express";
import { z } from "zod";
import { Component } from "../../models/index.js";
import { requirePermission } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../utils/errors.js";
import { logAudit } from "../../utils/audit.js";
import { escapeRegex, searchText, pageOf, pagesOf, label } from "./helpers.js";

// Phase 3: manage the existing learning components. There is no create/delete: the 30 components are a fixed set.
const router = Router();

const list = (max, itemMax) => z.array(z.string().trim().min(1).max(itemMax)).max(max);
const patchSchema = z.object({
  name: label("Name", 2, 120),
  summary: z.string().trim().max(400),
  tip: z.string().trim().max(400),
  image: z.string().trim().max(200).refine((v) => v === "" || /^\/[A-Za-z0-9_\-./]+$/.test(v) && !v.includes(".."), "Use a path starting with / such as /components/arduino.png"),
  uses: list(12, 200),
  steps: list(15, 300),
  pins: z.array(z.object({ name: z.string().trim().min(1).max(80), note: z.string().trim().max(400) })).max(20),
  wire: z.array(z.object({ from: z.string().trim().min(1).max(80), to: z.string().trim().min(1).max(80), color: z.string().trim().max(20) })).max(20),
  isVisible: z.boolean(),
}).partial().strict();

const row = (c) => ({ id: c._id, slug: c.slug, name: c.name, category: c.category, image: c.image, isVisible: c.isVisible, order: c.order, updatedAt: c.updatedAt });
const full = (c) => ({ ...row(c), kind: c.kind, summary: c.summary, tip: c.tip, uses: c.uses, steps: c.steps, pins: c.pins, wire: c.wire });

router.get("/components", requirePermission("components.view"), asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageOf(req.query);
  const filter = {};
  const q = searchText(req.query.q);
  if (q) { const rx = new RegExp(escapeRegex(q), "i"); filter.$or = [{ name: rx }, { slug: rx }, { summary: rx }]; }
  if (req.query.category) filter.category = String(req.query.category).slice(0, 40);
  if (req.query.visibility === "visible") filter.isVisible = true;
  if (req.query.visibility === "hidden") filter.isVisible = false;
  const [items, total, categories] = await Promise.all([
    Component.find(filter).sort({ order: 1, name: 1 }).skip(skip).limit(limit).lean(),
    Component.countDocuments(filter),
    Component.distinct("category"),
  ]);
  res.json({ page, limit, total, pages: pagesOf(total, limit), categories: categories.sort(), items: items.map(row) });
}));

router.get("/components/:slug", requirePermission("components.view"), asyncHandler(async (req, res) => {
  const c = await Component.findOne({ slug: String(req.params.slug).toLowerCase() }).lean();
  if (!c) throw new HttpError(404, "Component not found.");
  res.json({ component: full(c) });
}));

router.patch("/components/:slug", requirePermission("components.manage"), asyncHandler(async (req, res) => {
  const data = patchSchema.parse(req.body);
  const c = await Component.findOne({ slug: String(req.params.slug).toLowerCase() });
  if (!c) throw new HttpError(404, "Component not found.");
  const keys = Object.keys(data);
  for (const k of keys) c[k] = data[k];
  await c.save();
  if (keys.length) await logAudit(req, { action: "component.update", targetType: "component", targetId: c.slug, summary: `Updated "${c.name}": ${keys.join(", ")}.` });
  res.json({ component: full(c) });
}));

export default router;
