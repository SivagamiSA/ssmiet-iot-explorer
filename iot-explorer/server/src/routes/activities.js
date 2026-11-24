import { Router } from "express";
import { StudentProgress } from "../models/index.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../utils/errors.js";
import { SIMULATION_IDS, QUIZ_TITLES, SIMULATION_POINTS, QUIZ_POINTS, QUIZ_PASS_PERCENT } from "../data/activities.js";

// Simulation lab + quizzes. Everything is stored in the EXISTING StudentProgress (simulations, quizResults, points)
// and Certificate collections, so the dashboard, badges and Admin Portal reports pick it up with no changes.
const router = Router();
router.use(authenticate, requireRole("student"));

const ensureProgress = (studentId) =>
  StudentProgress.updateOne({ student: studentId }, { $setOnInsert: { student: studentId } }, { upsert: true });
const clampInt = (v, min, max) => Math.max(min, Math.min(max, Math.round(Number(v) || 0)));

// GET /api/student/simulations  -> this student's saved simulation rows
router.get("/simulations", asyncHandler(async (req, res) => {
  const p = await StudentProgress.findOne({ student: req.user._id }).lean();
  res.json({
    items: (p?.simulations ?? []).map((s) => ({ projectSlug: s.projectSlug, attempts: s.attempts, bestScore: s.bestScore, completed: s.completed, lastAttemptAt: s.lastAttemptAt ?? null })),
  });
}));

// PUT /api/student/simulations/:id  { attempts, connectionAccuracy, completed }
// Saves one project row. Points are awarded ONCE, the first time the project is completed (the update only matches while it is not yet completed).
router.put("/simulations/:id", asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!SIMULATION_IDS.has(id)) throw new HttpError(404, "Simulation project not found.");
  const sid = req.user._id;
  const attempts = clampInt(req.body?.attempts, 0, 10000);
  const bestScore = clampInt(req.body?.connectionAccuracy, 0, 100);
  const completed = req.body?.completed === true;
  const now = new Date();
  await ensureProgress(sid);

  let awarded = false;
  if (completed) {
    const r = await StudentProgress.updateOne(
      { student: sid, simulations: { $elemMatch: { projectSlug: id, completed: { $ne: true } } } },
      { $set: { "simulations.$.completed": true, "simulations.$.lastAttemptAt": now }, $max: { "simulations.$.attempts": attempts, "simulations.$.bestScore": bestScore }, $inc: { points: SIMULATION_POINTS } }
    );
    awarded = r.modifiedCount > 0;
  }
  if (!awarded) {
    const r = await StudentProgress.updateOne(
      { student: sid, simulations: { $elemMatch: { projectSlug: id } } },
      { $set: { "simulations.$.lastAttemptAt": now }, $max: { "simulations.$.attempts": attempts, "simulations.$.bestScore": bestScore } }
    );
    if (r.matchedCount === 0) {
      const push = await StudentProgress.updateOne(
        { student: sid, "simulations.projectSlug": { $ne: id } },
        { $push: { simulations: { projectSlug: id, attempts, bestScore, completed, lastAttemptAt: now } }, ...(completed ? { $inc: { points: SIMULATION_POINTS } } : {}) }
      );
      awarded = completed && push.modifiedCount > 0;
    }
  }
  const p = await StudentProgress.findOne({ student: sid }).lean();
  res.json({ projectSlug: id, completed: !!p.simulations.find((s) => s.projectSlug === id)?.completed, pointsAwarded: awarded ? SIMULATION_POINTS : 0, points: p.points });
}));

// GET /api/student/quizzes  -> best score per quiz plus the ids of passed quizzes (marks them on the Quizzes page)
router.get("/quizzes", asyncHandler(async (req, res) => {
  const p = await StudentProgress.findOne({ student: req.user._id }).lean();
  const byQuiz = new Map();
  for (const r of p?.quizResults ?? []) {
    const cur = byQuiz.get(r.quizId) ?? { quizId: r.quizId, attempts: 0, best: 0 };
    cur.attempts += 1; cur.best = Math.max(cur.best, r.percent ?? 0);
    byQuiz.set(r.quizId, cur);
  }
  const results = [...byQuiz.values()];
  res.json({ results, passed: results.filter((r) => r.best >= QUIZ_PASS_PERCENT).map((r) => r.quizId) });
}));

// POST /api/student/quizzes/:id/result  { score, total }
// Saves the attempt. The first pass (60% or more) awards points ONCE. No certificate here: the only certificate
// is issued by the final assessment (see finalAssessment.js).
router.post("/quizzes/:id/result", asyncHandler(async (req, res) => {
  const quizId = req.params.id;
  if (!QUIZ_TITLES.has(quizId)) throw new HttpError(404, "Quiz not found.");
  const total = Number(req.body?.total), score = Number(req.body?.score);
  if (!Number.isInteger(total) || total < 1 || total > 20 || !Number.isInteger(score) || score < 0 || score > total) throw new HttpError(400, "That quiz result is not valid.");
  const sid = req.user._id;
  const percent = Math.round((score / total) * 100);
  const passed = percent >= QUIZ_PASS_PERCENT;
  await ensureProgress(sid);

  // Points only for the first pass: a pass is awarded when no earlier passing result exists for this quiz.
  const earlier = passed ? await StudentProgress.exists({ student: sid, quizResults: { $elemMatch: { quizId, percent: { $gte: QUIZ_PASS_PERCENT } } } }) : true;
  const pointsAwarded = !earlier ? QUIZ_POINTS : 0;
  await StudentProgress.updateOne(
    { student: sid },
    { $push: { quizResults: { quizId, score, total, percent, takenAt: new Date() } }, ...(pointsAwarded ? { $inc: { points: pointsAwarded } } : {}) }
  );
  const p = await StudentProgress.findOne({ student: sid }).lean();
  res.json({ quizId, score, total, percent, passed, pointsAwarded, points: p.points });
}));

export default router;
