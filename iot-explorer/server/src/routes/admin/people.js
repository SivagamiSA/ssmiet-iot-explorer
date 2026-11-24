import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Student, School, StudentProgress } from "../../models/index.js";
import { nameKeyOf } from "../../models/School.js";
import { requirePermission } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../utils/errors.js";
import { logAudit } from "../../utils/audit.js";
import { LESSONS } from "../../data/catalog.js";
import { escapeRegex, searchText, pageOf, pagesOf, idOr404, label } from "./helpers.js";

// Phase 2: Student & School management. Mounted under /api/admin (already admin-only); each route adds its permission.
const router = Router();

const schoolBody = z.object({
  name: label("School name", 2, 120),
  city: z.string().trim().max(80).optional().default(""),
  district: z.string().trim().max(80).optional().default(""),
  isActive: z.boolean().optional(),
});
const studentPatch = z.object({
  name: label("Student name", 2, 80).optional(),
  standard: z.coerce.number().refine((n) => [8, 9, 10, 11, 12].includes(n), "Standard must be 8 to 12").optional(),
  schoolId: z.union([z.string(), z.null()]).optional(),
  isActive: z.boolean().optional(),
}).strict();

const publicStudent = (s) => ({ id: s._id, name: s.name, email: s.email, standard: s.standard, schoolName: s.schoolName, school: s.schoolId?.name ? { id: s.schoolId._id, name: s.schoolId.name } : null, isActive: s.isActive, createdAt: s.createdAt });

// ---------- students ----------
router.get("/students", requirePermission("students.view"), asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageOf(req.query);
  const filter = {};
  const q = searchText(req.query.q);
  if (q) { const rx = new RegExp(escapeRegex(q), "i"); filter.$or = [{ name: rx }, { email: rx }, { schoolName: rx }]; }
  if (req.query.schoolId === "none") filter.schoolId = null;
  else if (req.query.schoolId) filter.schoolId = idOr404(req.query.schoolId, "School");
  if (req.query.standard) { const n = Number(req.query.standard); if ([8, 9, 10, 11, 12].includes(n)) filter.standard = n; }
  if (req.query.status === "active") filter.isActive = true;
  if (req.query.status === "inactive") filter.isActive = false;

  const [items, total] = await Promise.all([
    Student.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("schoolId", "name").lean(),
    Student.countDocuments(filter),
  ]);
  res.json({ page, limit, total, pages: pagesOf(total, limit), items: items.map(publicStudent) });
}));

router.get("/students/:id", requirePermission("students.view"), asyncHandler(async (req, res) => {
  const s = await Student.findById(idOr404(req.params.id, "Student")).populate("schoolId", "name").lean();
  if (!s) throw new HttpError(404, "Student not found.");
  const p = await StudentProgress.findOne({ student: s._id }).lean();
  const done = new Map((p?.completedLessons ?? []).map((l) => [l.lessonId, l.completedAt]));
  const quizResults = [...(p?.quizResults ?? [])].sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt));
  res.json({
    student: publicStudent(s),
    progress: {
      points: p?.points ?? 0,
      lessons: { total: LESSONS.length, completed: done.size, items: LESSONS.map((l) => ({ id: l.id, title: l.title, completed: done.has(l.id), completedAt: done.get(l.id) ?? null })) },
      simulations: (p?.simulations ?? []).map((x) => ({ projectSlug: x.projectSlug, attempts: x.attempts, bestScore: x.bestScore, completed: x.completed, lastAttemptAt: x.lastAttemptAt ?? null })),
      quizResults: quizResults.map((r) => ({ quizId: r.quizId, score: r.score, total: r.total, percent: r.percent, takenAt: r.takenAt })),
    },
  });
}));

router.patch("/students/:id", requirePermission("students.manage"), asyncHandler(async (req, res) => {
  const data = studentPatch.parse(req.body);
  const student = await Student.findById(idOr404(req.params.id, "Student"));
  if (!student) throw new HttpError(404, "Student not found.");
  const changed = [];
  if (data.name !== undefined && data.name !== student.name) { student.name = data.name; changed.push("name"); }
  if (data.standard !== undefined && data.standard !== student.standard) { student.standard = data.standard; changed.push("standard"); }
  if (data.isActive !== undefined && data.isActive !== student.isActive) { student.isActive = data.isActive; changed.push(data.isActive ? "activated" : "deactivated"); }
  if (data.schoolId !== undefined) {
    if (data.schoolId === null || data.schoolId === "") {
      if (student.schoolId) changed.push("school unlinked");
      student.schoolId = null; // schoolName is kept as it was
    } else {
      const school = await School.findById(idOr404(data.schoolId, "School"));
      if (!school) throw new HttpError(400, "That school does not exist.", { schoolId: "Choose an existing school." });
      if (String(student.schoolId) !== String(school._id)) changed.push("school");
      student.schoolId = school._id; student.schoolName = school.name;
    }
  }
  await student.save();
  if (changed.length) await logAudit(req, { action: "student.update", targetType: "student", targetId: student._id, summary: `Updated ${student.email}: ${changed.join(", ")}.` });
  res.json({ ok: true, student: { id: student._id, name: student.name, standard: student.standard, schoolName: student.schoolName, schoolId: student.schoolId, isActive: student.isActive } });
}));

// ---------- schools ----------
const withCounts = (match, skip, limit) => School.aggregate([
  { $match: match }, { $sort: { name: 1 } }, { $skip: skip }, { $limit: limit },
  { $lookup: { from: "students", let: { id: "$_id" }, pipeline: [{ $match: { $expr: { $eq: ["$schoolId", "$$id"] } } }, { $count: "n" }], as: "c" } },
  { $project: { name: 1, city: 1, district: 1, isActive: 1, createdAt: 1, studentCount: { $ifNull: [{ $first: "$c.n" }, 0] } } },
]);
const publicSchool = (s) => ({ id: s._id, name: s.name, city: s.city, district: s.district, isActive: s.isActive, studentCount: s.studentCount ?? 0, createdAt: s.createdAt });

router.get("/schools", requirePermission("schools.view"), asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageOf(req.query);
  const match = {};
  const q = searchText(req.query.q);
  if (q) { const rx = new RegExp(escapeRegex(q), "i"); match.$or = [{ name: rx }, { city: rx }, { district: rx }]; }
  if (req.query.status === "active") match.isActive = true;
  if (req.query.status === "inactive") match.isActive = false;
  const [items, total, unlinked] = await Promise.all([withCounts(match, skip, limit), School.countDocuments(match), Student.countDocuments({ schoolId: null })]);
  res.json({ page, limit, total, pages: pagesOf(total, limit), unlinkedStudents: unlinked, items: items.map(publicSchool) });
}));

router.get("/schools/:id", requirePermission("schools.view"), asyncHandler(async (req, res) => {
  const id = idOr404(req.params.id, "School");
  const [found] = await withCounts({ _id: new mongoose.Types.ObjectId(id) }, 0, 1);
  if (!found) throw new HttpError(404, "School not found.");
  res.json({ school: publicSchool(found) });
}));

const assertNameFree = async (name, exceptId) => {
  const clash = await School.findOne({ nameKey: nameKeyOf(name), ...(exceptId ? { _id: { $ne: exceptId } } : {}) }).select("_id");
  if (clash) throw new HttpError(409, "A school with this name already exists.", { name: "A school with this name already exists." });
};

router.post("/schools", requirePermission("schools.manage"), asyncHandler(async (req, res) => {
  const data = schoolBody.parse(req.body);
  await assertNameFree(data.name);
  const school = await School.create({ name: data.name, city: data.city, district: data.district, isActive: data.isActive ?? true });
  // Link existing students who typed this school name at registration and are not linked yet.
  const linked = await Student.updateMany(
    { schoolId: null, schoolName: { $regex: new RegExp(`^\\s*${escapeRegex(school.name).replace(/\s+/g, "\\s+")}\\s*$`, "i") } },
    { $set: { schoolId: school._id, schoolName: school.name } }
  );
  await logAudit(req, { action: "school.create", targetType: "school", targetId: school._id, summary: `Added school "${school.name}" (${linked.modifiedCount} student(s) linked).` });
  res.status(201).json({ school: publicSchool({ ...school.toObject(), studentCount: linked.modifiedCount }), linkedStudents: linked.modifiedCount });
}));

router.patch("/schools/:id", requirePermission("schools.manage"), asyncHandler(async (req, res) => {
  const data = schoolBody.partial().parse(req.body);
  const school = await School.findById(idOr404(req.params.id, "School"));
  if (!school) throw new HttpError(404, "School not found.");
  const renamed = data.name !== undefined && data.name !== school.name;
  if (renamed) { await assertNameFree(data.name, school._id); school.name = data.name; }
  if (data.city !== undefined) school.city = data.city;
  if (data.district !== undefined) school.district = data.district;
  if (data.isActive !== undefined) school.isActive = data.isActive;
  await school.save();
  if (renamed) await Student.updateMany({ schoolId: school._id }, { $set: { schoolName: school.name } }); // keep the legacy field in step
  const studentCount = await Student.countDocuments({ schoolId: school._id });
  await logAudit(req, { action: "school.update", targetType: "school", targetId: school._id, summary: `Updated school "${school.name}".` });
  res.json({ school: publicSchool({ ...school.toObject(), studentCount }) });
}));

export default router;
