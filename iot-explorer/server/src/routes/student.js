import { Router } from "express";
import { Project, Event, Certificate, StudentProgress } from "../models/index.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../utils/errors.js";
import { LESSONS, BADGES, LESSON_POINTS, levelFor } from "../data/catalog.js";

const router = Router();
router.use(authenticate, requireRole("student")); // every route below is students-only

// GET /api/student/dashboard  -> everything the Student Dashboard shows, in one request
router.get("/dashboard", asyncHandler(async (req, res) => {
  const student = req.user;
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

  const [progress, projects, events, certificates] = await Promise.all([
    StudentProgress.findOneAndUpdate({ student: student._id }, { $setOnInsert: { student: student._id } }, { upsert: true, new: true }),
    Project.find({ status: "approved" }).sort({ order: 1, createdAt: 1 }).lean(), // admin-approved only
    Event.find({ status: "published", date: { $gte: startOfToday } }).sort({ date: 1 }).limit(5).lean(), // published only
    Certificate.find({ student: student._id, quizId: "final-assessment" }).sort({ issuedAt: -1 }).lean(),
  ]);

  // Lessons
  const doneIds = new Map(progress.completedLessons.map((l) => [l.lessonId, l.completedAt]));
  const completed = LESSONS.filter((l) => doneIds.has(l.id)).map((l) => ({ ...l, completedAt: doneIds.get(l.id) }));
  const lessons = {
    total: LESSONS.length, completed: completed.length,
    percent: LESSONS.length ? Math.round((completed.length / LESSONS.length) * 100) : 0,
    completedList: completed,
  };

  // Simulations (one per approved project)
  const simBySlug = new Map(progress.simulations.map((s) => [s.projectSlug, s]));
  const simItems = projects.map((p) => {
    const s = simBySlug.get(p.slug);
    return { slug: p.slug, title: p.title, attempts: s?.attempts ?? 0, bestScore: s?.bestScore ?? 0, completed: !!s?.completed };
  });
  const simulations = {
    total: simItems.length, attempted: simItems.filter((s) => s.attempts > 0).length,
    completed: simItems.filter((s) => s.completed).length, items: simItems,
  };

  // Quizzes
  const results = [...progress.quizResults].sort((a, b) => b.takenAt - a.takenAt);
  const quizzes = {
    taken: results.length,
    average: results.length ? Math.round(results.reduce((n, r) => n + r.percent, 0) / results.length) : 0,
    best: results.reduce((n, r) => Math.max(n, r.percent), 0),
    recent: results.slice(0, 5).map((r) => ({ quizId: r.quizId, score: r.score, total: r.total, percent: r.percent, takenAt: r.takenAt })),
  };

  // Badges are worked out from the numbers above
  const stats = {
    lessonsDone: lessons.completed, totalLessons: lessons.total, simsPassed: simulations.completed,
    quizzesTaken: quizzes.taken, bestQuizPercent: quizzes.best, certificates: certificates.length,
  };
  const badges = BADGES.map((b) => ({ key: b.key, title: b.title, description: b.description, earned: b.earned(stats) }));

  res.json({
    student: { name: student.name, schoolName: student.schoolName, standard: student.standard },
    points: progress.points, ...levelFor(progress.points),
    lessons, badges, simulations, quizzes,
    projects: projects.slice(0, 6).map((p) => ({ slug: p.slug, title: p.title, summary: p.summary, difficulty: p.difficulty, image: p.image })),
    projectCount: projects.length,
    events: events.map((e) => ({ id: e._id, title: e.title, date: e.date, location: e.location })),
    certificates: certificates.map((c) => ({ id: c._id, title: c.title, percent: c.percent, issuedAt: c.issuedAt })),
  });
}));

// GET /api/student/lessons  -> the lesson list with this student's completed/not-started status (Learning page)
router.get("/lessons", asyncHandler(async (req, res) => {
  const progress = await StudentProgress.findOneAndUpdate({ student: req.user._id }, { $setOnInsert: { student: req.user._id } }, { upsert: true, new: true });
  const done = new Map(progress.completedLessons.map((l) => [l.lessonId, l.completedAt]));
  const items = LESSONS.map((l) => ({ id: l.id, title: l.title, completed: done.has(l.id), completedAt: done.get(l.id) ?? null }));
  const completed = items.filter((l) => l.completed).length;
  res.json({ total: items.length, completed, percent: items.length ? Math.round((completed / items.length) * 100) : 0, items });
}));

// POST /api/student/lessons/:id/complete  -> marks a lesson done and awards points ONCE (safe to call twice)
router.post("/lessons/:id/complete", asyncHandler(async (req, res) => {
  const lesson = LESSONS.find((l) => l.id === req.params.id);
  if (!lesson) throw new HttpError(404, "Lesson not found.");
  await StudentProgress.updateOne({ student: req.user._id }, { $setOnInsert: { student: req.user._id } }, { upsert: true });
  // Only matches while this lesson is NOT yet in the list, so points can never be awarded twice.
  const first = await StudentProgress.findOneAndUpdate(
    { student: req.user._id, "completedLessons.lessonId": { $ne: lesson.id } },
    { $push: { completedLessons: { lessonId: lesson.id, completedAt: new Date() } }, $inc: { points: LESSON_POINTS } },
    { new: true }
  );
  const progress = first ?? (await StudentProgress.findOne({ student: req.user._id }));
  res.json({ lessonId: lesson.id, alreadyCompleted: !first, pointsAwarded: first ? LESSON_POINTS : 0, points: progress.points, completed: progress.completedLessons.length, total: LESSONS.length });
}));

export default router;
