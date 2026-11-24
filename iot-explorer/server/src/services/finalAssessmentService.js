// Final assessment + certificate rules, kept free of Express and of direct model imports so they can be tested without a database.
// routes/finalAssessment.js passes in the real Mongoose models; tests pass in an in-memory fake with the same unique-index behaviour.
import { HttpError } from "../utils/errors.js";
import { SIMULATION_IDS, QUIZ_PASS_PERCENT } from "../data/activities.js";
import {
  FINAL_QUIZ_ID, FINAL_TITLE, FINAL_QUESTION_COUNT, FINAL_PASS_PERCENT, FINAL_POINTS, FINAL_ATTEMPT_HOURS, COLLEGE_NAME,
  pickQuestions, publicQuestion, isCorrect,
} from "../data/finalAssessment.js";

const isDuplicateKey = (e) => e?.code === 11000;
/** 6 of 10 passes (60%). Integer arithmetic: no rounding surprises. */
export const isPassingScore = (score, total) => total > 0 && score * 100 >= FINAL_PASS_PERCENT * total;

/** Eligibility is worked out from saved quiz results (a "pass" is a saved result of 60% or more). */
export function eligibility(progress) {
  const passedIds = new Set((progress?.quizResults ?? []).filter((r) => (r.percent ?? 0) >= QUIZ_PASS_PERCENT).map((r) => r.quizId));
  const generalPassed = passedIds.has("general");
  const projectQuizzesPassed = [...passedIds].filter((id) => SIMULATION_IDS.has(id)).length;
  return { generalPassed, projectQuizzesPassed, eligible: generalPassed && projectQuizzesPassed >= 1 };
}

// What the certificate page needs. There is deliberately NO certificate number. School and standard come from the student's profile.
export const certificateView = (c, student) => ({
  title: c.title, percent: c.percent, issuedAt: c.issuedAt,
  name: c.recipientName || student.name, nameLocked: !!c.nameLocked,
  schoolName: student.schoolName, standard: student.standard, collegeName: COLLEGE_NAME,
});

const resultView = (a) => ({
  score: a.score, total: a.total, percent: a.percent, passed: !!a.passed, passPercent: FINAL_PASS_PERCENT,
  attemptNumber: a.attemptNumber ?? 1, completedAt: a.completedAt ?? null,
});

const NAME_HINT = "Use letters, spaces, dots, hyphens and apostrophes only.";

export function createFinalAssessmentService({ FinalAttempt, Certificate, StudentProgress, log = console }) {
  const progressOf = (studentId) => StudentProgress.findOne({ student: studentId }).lean();
  const finalCertificate = (studentId) => Certificate.findOne({ student: studentId, quizId: FINAL_QUIZ_ID }).lean();
  /** The student's permanent pass (null until passed). Checked on the backend for every start / submit / certificate request. */
  const passRecord = async (studentId) => (await FinalAttempt.findOne({ student: studentId, passed: true }).lean()) ?? null;
  const isLocked = async (studentId) => !!((await passRecord(studentId)) || (await finalCertificate(studentId)));

  const lockedError = () => new HttpError(409, "You have already passed the final assessment. Further attempts are locked.", { code: "ALREADY_PASSED" });
  const replacedError = () => new HttpError(409, "This attempt was replaced by a newer one. Please start the assessment again.", { code: "ATTEMPT_EXPIRED" });

  /** Lock state, the CURRENT result and the certificate if already generated. */
  async function getStatus(student) {
    const [progress, cert, current, pass] = await Promise.all([
      progressOf(student._id),
      finalCertificate(student._id),
      FinalAttempt.findOne({ student: student._id, status: "submitted", submittedAt: { $exists: true } }).sort({ submittedAt: -1 }).lean(),
      passRecord(student._id),
    ]);
    const passed = !!pass || !!cert;
    const shown = pass ?? current; // a recorded pass always wins over whatever else is stored
    return {
      ...eligibility(progress),
      questionCount: FINAL_QUESTION_COUNT, passPercent: FINAL_PASS_PERCENT,
      studentName: student.name, schoolName: student.schoolName, standard: student.standard, collegeName: COLLEGE_NAME,
      // "not_started" -> Start button, "failed" -> Start button again (unlimited retakes), "passed" -> permanently locked, Generate Certificate button
      state: passed ? "passed" : current ? "failed" : "not_started",
      passed,
      attempts: shown?.attemptNumber ?? 0,
      lastScore: shown?.score ?? null, lastTotal: shown?.total ?? null,
      lastPercent: shown?.percent ?? null, bestPercent: shown?.percent ?? 0, // only the current (latest) result is kept
      completedAt: shown?.completedAt ?? cert?.issuedAt ?? null,
      certificate: passed && cert ? certificateView(cert, student) : null,
    };
  }

  /** A fresh set of 10 random questions. An unfinished attempt is resumed (same id) so a refresh never loses it. */
  async function startAttempt(student) {
    const sid = student._id;
    if (!eligibility(await progressOf(sid)).eligible) throw new HttpError(403, "Pass the General IoT quiz and at least one project quiz to unlock the final assessment.", { code: "NOT_ELIGIBLE" });
    if (await isLocked(sid)) throw lockedError();

    const since = new Date(Date.now() - FINAL_ATTEMPT_HOURS * 3600 * 1000);
    const resumable = () => FinalAttempt.findOne({ student: sid, status: "open", createdAt: { $gte: since } }).sort({ createdAt: -1 });
    let attempt = await resumable();
    if (!attempt) {
      // Expire every stale unfinished attempt so it can never block (or later be graded as) the new one.
      await FinalAttempt.updateMany({ student: sid, status: "open" }, { $set: { status: "expired", passed: false } });
      const last = await FinalAttempt.findOne({ student: sid }).sort({ attemptNumber: -1, createdAt: -1 }).lean();
      try {
        attempt = await FinalAttempt.create({ student: sid, questions: pickQuestions(), total: FINAL_QUESTION_COUNT, attemptNumber: (last?.attemptNumber ?? 0) + 1 });
      } catch (e) {
        if (!isDuplicateKey(e)) throw e;
        attempt = await resumable(); // two Start clicks raced: use the attempt the other one created
        if (!attempt) throw new HttpError(409, "Another attempt is being started. Please try again in a moment.", { code: "ATTEMPT_IN_PROGRESS" });
      }
    }
    return { attemptId: String(attempt._id), attemptNumber: attempt.attemptNumber ?? 1, passPercent: FINAL_PASS_PERCENT, questions: attempt.questions.map(publicQuestion) };
  }

  /** Grades on the server. All questions must be answered. Returns the stored result again for a repeated submit. */
  async function submitAttempt(student, body) {
    const sid = student._id;
    const { attemptId, answers } = body ?? {};
    if (!attemptId || !Array.isArray(answers)) throw new HttpError(400, "That submission is not valid.", { code: "INVALID" });

    const attempt = await FinalAttempt.findOne({ _id: attemptId, student: sid }).catch(() => null); // student-scoped: another student's attempt id is simply "not found"
    if (!attempt) throw new HttpError(404, "This attempt was not found. Please start the assessment again.", { code: "ATTEMPT_NOT_FOUND" });

    // Duplicate submit (double click, second tab, lost response): answer with the stored result instead of an error.
    if (attempt.status === "submitted") {
      const cert = attempt.passed ? await finalCertificate(sid) : null;
      return { ...resultView(attempt), pointsAwarded: 0, duplicate: true, certificate: cert ? certificateView(cert, student) : null };
    }
    if (attempt.status !== "open") throw replacedError();
    if (await isLocked(sid)) throw lockedError();

    const total = attempt.questions.length;
    if (answers.length !== total || answers.some((a) => !Number.isInteger(a) || a < 0 || a > 3)) {
      throw new HttpError(400, `Answer all ${total} questions before submitting.`, { code: "INCOMPLETE" });
    }
    const score = attempt.questions.reduce((n, q, i) => n + (isCorrect(q, answers[i]) ? 1 : 0), 0);
    const percent = Math.round((score / total) * 100);
    const passed = isPassingScore(score, total);
    const now = new Date();

    // Grade + close in ONE atomic update that only matches while the attempt is still open: it can win exactly once.
    let graded;
    try {
      graded = await FinalAttempt.findOneAndUpdate(
        { _id: attempt._id, student: sid, status: "open" },
        { $set: { status: "submitted", score, total, percent, passed, answers, submittedAt: now, completedAt: passed ? now : null } },
        { new: true }
      );
    } catch (e) {
      if (!isDuplicateKey(e)) throw e;
      // The permanent-pass index fired: this student already has a pass saved. That is a real lock, not an expired attempt.
      if (await passRecord(sid)) throw lockedError();
      throw e;
    }
    if (!graded) {
      const again = await FinalAttempt.findOne({ _id: attempt._id, student: sid }).lean();
      if (again?.status === "submitted") return { ...resultView(again), pointsAwarded: 0, duplicate: true, certificate: null };
      throw replacedError();
    }

    // The new result replaces any earlier graded (failed) result. Rows that a database repair marked as superseded passes are history and are never deleted.
    await FinalAttempt.deleteMany({ student: sid, _id: { $ne: graded._id }, status: { $in: ["submitted", "expired"] }, expiredReason: { $exists: false } });

    let pointsAwarded = 0;
    if (passed) {
      await StudentProgress.updateOne({ student: sid }, { $inc: { points: FINAL_POINTS } }); // once: only the single winning grade gets here
      pointsAwarded = FINAL_POINTS;
    }
    return { ...resultView(graded), pointsAwarded, certificate: null };
  }

  /** Creates the certificate for a passed student exactly once; every later or simultaneous request gets the same one back. */
  async function ensureCertificate(student, pass, recipientName) {
    const existing = await finalCertificate(student._id);
    if (existing) return { certificate: existing, created: false };
    const issuedAt = pass.completedAt ?? pass.submittedAt ?? new Date();
    try {
      const created = await Certificate.create({
        student: student._id, title: FINAL_TITLE, quizId: FINAL_QUIZ_ID, percent: pass.percent,
        recipientName, nameLocked: true, nameSetAt: new Date(), issuedAt,
      });
      return { certificate: created.toObject(), created: true };
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      // Two requests raced and the other one won: hand back its certificate (idempotent).
      const winner = await finalCertificate(student._id);
      if (winner) return { certificate: winner, created: false };
      // A duplicate-key error with NO certificate for this student means a leftover unique index (for example the removed certificateId one) is rejecting the insert.
      log.error("[certificate] Insert rejected by a leftover unique index. Index:", JSON.stringify(error.keyPattern ?? {}), "- run: npm run db:repair-assessment");
      throw new HttpError(500, "The certificate could not be saved because of an outdated database index. Ask your administrator to run the database repair (npm run db:repair-assessment).", { code: "CERTIFICATE_INDEX_CONFLICT" });
    }
  }

  /** { name } -> the student's one final certificate (201 when created, 200 when it already existed). */
  async function generateCertificate(student, body) {
    // An existing certificate is always returned as-is, whatever the request body says.
    const existing = await finalCertificate(student._id);
    if (existing) return { certificate: certificateView(existing, student), created: false };

    const pass = await passRecord(student._id);
    if (!pass) throw new HttpError(403, "Pass the final assessment before generating your certificate.", { code: "NOT_PASSED" });
    const name = String(body?.name ?? student.name ?? "").replace(/\s+/g, " ").trim();
    if (name.length < 2 || name.length > 60) throw new HttpError(400, "Enter a name between 2 and 60 characters.", { name: "Enter a name between 2 and 60 characters." });
    if (!/^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u.test(name)) throw new HttpError(400, NAME_HINT, { name: NAME_HINT });

    const result = await ensureCertificate(student, pass, name);
    return { certificate: certificateView(result.certificate, student), created: result.created };
  }

  return { getStatus, startAttempt, submitAttempt, generateCertificate };
}
