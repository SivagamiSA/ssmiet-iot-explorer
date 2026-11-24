import { Router } from "express";
import { Student, StudentProgress, Project, Component } from "../../models/index.js";
import { requirePermission } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/errors.js";
import { logAudit } from "../../utils/audit.js";
import { LESSONS } from "../../data/catalog.js";

// Phase 8: read-only reports computed from the real records. Nothing here writes to the database (except the audit entry for an export).
const router = Router();

const monthsBack = (n) => { const d = new Date(); d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0); d.setUTCMonth(d.getUTCMonth() - (n - 1)); return d; };

router.get("/reports/overview", requirePermission("reports.view"), asyncHandler(async (_req, res) => {
  const since = monthsBack(12);
  const [total, active, byStandard, bySchool, monthly, lessonRows, withProgress, simRows, quizRows, projStatus, projDifficulty, compTotal, compVisible] = await Promise.all([
    Student.countDocuments({}), Student.countDocuments({ isActive: true }),
    Student.aggregate([{ $group: { _id: "$standard", n: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Student.aggregate([
      { $group: { _id: { $ifNull: ["$schoolId", "$schoolName"] }, name: { $first: "$schoolName" }, n: { $sum: 1 } } },
      { $sort: { n: -1 } }, { $limit: 10 },
    ]),
    Student.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, n: { $sum: 1 } } }]),
    StudentProgress.aggregate([{ $unwind: "$completedLessons" }, { $group: { _id: "$completedLessons.lessonId", n: { $sum: 1 } } }]),
    StudentProgress.countDocuments({}),
    StudentProgress.aggregate([{ $unwind: "$simulations" }, { $group: { _id: "$simulations.projectSlug", students: { $sum: 1 }, attempts: { $sum: "$simulations.attempts" }, completed: { $sum: { $cond: ["$simulations.completed", 1, 0] } } } }, { $sort: { attempts: -1 } }]),
    StudentProgress.aggregate([{ $unwind: "$quizResults" }, { $group: { _id: "$quizResults.quizId", taken: { $sum: 1 }, avg: { $avg: "$quizResults.percent" } } }, { $sort: { taken: -1 } }]),
    Project.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    Project.aggregate([{ $group: { _id: "$difficulty", n: { $sum: 1 } } }]),
    Component.countDocuments({}), Component.countDocuments({ isVisible: true }),
  ]);

  // Fill empty months so the chart has no gaps.
  const m = new Map(monthly.map((r) => [r._id, r.n]));
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(since); d.setUTCMonth(since.getUTCMonth() + i); const k = d.toISOString().slice(0, 7); return { month: k, count: m.get(k) ?? 0 }; });
  const done = new Map(lessonRows.map((r) => [r._id, r.n]));
  const kv = (rows) => Object.fromEntries(rows.map((r) => [String(r._id), r.n]));
  const quizTotal = quizRows.reduce((n, r) => n + r.taken, 0);

  res.json({
    generatedAt: new Date(),
    students: { total, active, inactive: total - active, withProgress,
      byStandard: byStandard.map((r) => ({ standard: r._id, count: r.n })),
      topSchools: bySchool.map((r) => ({ name: r.name, count: r.n })),
      registrationsByMonth: months },
    lessons: LESSONS.map((l) => ({ id: l.id, title: l.title, completedBy: done.get(l.id) ?? 0 })),
    simulations: simRows.map((r) => ({ projectSlug: r._id, students: r.students, attempts: r.attempts, completed: r.completed })),
    quizzes: { taken: quizTotal, average: quizTotal ? Math.round(quizRows.reduce((n, r) => n + r.avg * r.taken, 0) / quizTotal) : 0, byQuiz: quizRows.map((r) => ({ quizId: r._id, taken: r.taken, average: Math.round(r.avg) })) },
    projects: { total: Object.values(kv(projStatus)).reduce((a, b) => a + b, 0), byStatus: kv(projStatus), byDifficulty: kv(projDifficulty) },
    components: { total: compTotal, visible: compVisible },
  });
}));

// CSV export (reports.manage). Cells starting with = + - @ are prefixed with ' so spreadsheets never run them as formulas.
const cell = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };

router.get("/reports/students.csv", requirePermission("reports.manage"), asyncHandler(async (req, res) => {
  const rows = await Student.aggregate([
    { $sort: { createdAt: 1 } }, { $limit: 50000 },
    { $lookup: { from: "studentprogress", localField: "_id", foreignField: "student", as: "p" } },
    { $project: { name: 1, email: 1, standard: 1, schoolName: 1, isActive: 1, createdAt: 1, points: { $ifNull: [{ $first: "$p.points" }, 0] }, lessons: { $size: { $ifNull: [{ $first: "$p.completedLessons" }, []] } }, quizzes: { $size: { $ifNull: [{ $first: "$p.quizResults" }, []] } } } },
  ]);
  const head = ["Name", "Email", "Standard", "School", "Status", "Joined", "Lessons completed", "Quizzes taken", "Points"];
  const lines = [head.map(cell).join(",")].concat(rows.map((r) => [r.name, r.email, r.standard, r.schoolName, r.isActive ? "Active" : "Inactive", r.createdAt.toISOString().slice(0, 10), r.lessons, r.quizzes, r.points].map(cell).join(",")));
  await logAudit(req, { action: "report.export", targetType: "report", targetId: "students", summary: `Exported ${rows.length} student row(s) to CSV.` });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="students.csv"');
  res.send("﻿" + lines.join("\r\n"));
}));

export default router;
