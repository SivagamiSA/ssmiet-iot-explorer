// Final assessment API tests WITHOUT a database: the Mongoose model methods used by the routes are replaced with in-memory stubs.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/never-used";

const { createApp } = await import("../src/app.js");
const { Student, StudentProgress, Certificate, FinalAttempt } = await import("../src/models/index.js");
const { signToken } = await import("../src/utils/token.js");
const { POOL, POOL_BY_KEY } = await import("../src/data/finalAssessment.js");

const STUDENT = { _id: "st-1", name: "Siva", role: "student", isActive: true, email: "siva@x.com", schoolName: "SSM Institute of Engineering and Technology", standard: 11 };
let progress, certs, attempts, forceCertCollision = false, certificateCreateCalls = 0, seq = 0;
const reset = () => { progress = { quizResults: [], points: 0 }; certs = []; attempts = []; seq = 0; forceCertCollision = false; certificateCreateCalls = 0; };
reset();
const match = (o, f) => Object.entries(f).every(([k, v]) => {
  if (v && typeof v === "object") {
    if ("$ne" in v) return o[k] !== v.$ne;
    if ("$gte" in v) return o[k] >= v.$gte;
    if ("$exists" in v) return (o[k] !== undefined) === v.$exists;
    if ("$in" in v) return v.$in.includes(o[k]);
  }
  return o[k] === v;
});

Student.findById = async (id) => (id === STUDENT._id ? STUDENT : null);
StudentProgress.findOne = () => ({ lean: async () => progress });
StudentProgress.exists = async (f) => (progress.quizResults.some((r) => r.quizId === f.quizResults.$elemMatch.quizId && r.percent >= f.quizResults.$elemMatch.percent.$gte) ? { _id: 1 } : null);
StudentProgress.updateOne = async (_f, u) => {
  if (u.$push?.quizResults) progress.quizResults.push(u.$push.quizResults);
  if (u.$inc?.points) progress.points += u.$inc.points;
  return {};
};
Certificate.findOne = (f) => ({ lean: async () => certs.find((c) => match(c, f)) ?? null });
Certificate.find = () => ({ sort: () => ({ lean: async () => certs }) });
Certificate.create = async (d) => {
  certificateCreateCalls += 1;
  if (forceCertCollision) { // a simultaneous request created this student's certificate first: the unique index rejects this insert
    forceCertCollision = false; certs.push({ ...d, recipientName: "Winner Name", nameLocked: true, issuedAt: new Date() });
    throw Object.assign(new Error("E11000 duplicate key"), { code: 11000, keyPattern: { student: 1, quizId: 1 } });
  }
  const c = { ...d, issuedAt: new Date() }; certs.push(c); return { toObject: () => c };
};
Certificate.findOneAndUpdate = (f, u) => ({ lean: async () => { const c = certs.find((x) => match(x, f)); if (c) Object.assign(c, u.$set); return c ?? null; } });
const newest = (f) => attempts.filter((x) => match(x, f)).sort((x, y) => y.seq - x.seq)[0] ?? null;
const query = (get) => { const q = { then: (a, b) => Promise.resolve(get()).then(a, b), catch: (fn) => Promise.resolve(get()).catch(fn), lean: () => Promise.resolve(get()), sort: () => q }; return q; };
FinalAttempt.findOne = (f) => query(() => newest(f));
FinalAttempt.create = async (d) => {
  if (attempts.some((a) => a.student === d.student && a.status === "open")) throw Object.assign(new Error("dup"), { code: 11000 }); // unique open-attempt index
  const a = { _id: `at-${++seq}`, seq, status: "open", passed: false, createdAt: new Date(), ...d }; attempts.push(a); return a;
};
FinalAttempt.findOneAndUpdate = (f, u) => query(() => { const a = attempts.find((x) => match(x, f)); if (a) Object.assign(a, u.$set); return a ?? null; });
FinalAttempt.updateMany = async (f, u) => { attempts.filter((a) => match(a, f)).forEach((a) => Object.assign(a, u.$set)); return {}; };
FinalAttempt.deleteMany = async (f) => { attempts = attempts.filter((a) => !match(a, f)); return {}; };

let server, base;
before(() => new Promise((res) => { server = createApp().listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${server.address().port}`; res(); }); }));
after(() => server.close());
const token = signToken(STUDENT);
const call = (method, path, body) => fetch(base + path, {
  method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined,
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));
const saveQuiz = (quizId, score, total) => call("POST", `/api/student/quizzes/${quizId}/result`, { score, total });
const unlock = async () => { await saveQuiz("general", 8, 8); await saveQuiz("digital-dice", 4, 5); };
/** Answer sheet with exactly `right` correct answers, using the server-side attempt record as the key. */
const sheet = (attempt, right) => attempt.questions.map((q, i) => {
  const correct = q.order.indexOf(POOL_BY_KEY.get(q.key).answer);
  return i < right ? correct : (correct + 1) % 4;
});

test("the bank has 300 unique questions, each with four options and a valid answer", () => {
  assert.equal(POOL.length, 300);
  assert.equal(new Set(POOL.map((q) => q.key)).size, 300);
  for (const q of POOL) { assert.deepEqual(Object.keys(q.options), ["A", "B", "C", "D"]); assert.equal(q.options[q.answer], q.correct_answer); }
});

test("final assessment is locked until the General quiz AND one project quiz are passed", async () => {
  reset();
  assert.equal((await call("POST", "/api/student/final-assessment/start", {})).status, 403);
  await saveQuiz("general", 8, 8); // general only
  let s = (await call("GET", "/api/student/final-assessment")).json;
  assert.deepEqual([s.generalPassed, s.projectQuizzesPassed, s.eligible], [true, 0, false]);
  assert.equal((await call("POST", "/api/student/final-assessment/start", {})).status, 403);
  await saveQuiz("digital-dice", 2, 5); // a FAILED project quiz does not count
  assert.equal((await call("GET", "/api/student/final-assessment")).json.eligible, false);
  await saveQuiz("digital-dice", 3, 5); // 60% passes
  s = (await call("GET", "/api/student/final-assessment")).json;
  assert.equal(s.eligible, true);
  assert.equal((await call("POST", "/api/student/final-assessment/start", {})).status, 200);
});

test("normal quizzes no longer issue a certificate and give points only once", async () => {
  reset();
  const first = (await saveQuiz("general", 8, 8)).json;
  assert.equal(first.certificate, undefined); assert.equal(first.pointsAwarded, 20);
  assert.equal((await saveQuiz("general", 8, 8)).json.pointsAwarded, 0);
  assert.equal(certs.length, 0);
});

test("an attempt has 10 distinct random questions and never exposes the answers", async () => {
  reset(); await unlock();
  const r = await call("POST", "/api/student/final-assessment/start", {});
  assert.equal(r.json.questions.length, 10);
  assert.equal(new Set(r.json.questions.map((q) => q.question + q.options.join())).size >= 9, true);
  assert.equal(new Set(attempts[0].questions.map((q) => q.key)).size, 10);
  const raw = JSON.stringify(r.json);
  assert.ok(!/"answer"|correct_answer/.test(raw));
  for (const q of r.json.questions) assert.equal(q.options.length, 4);
  // unfinished attempt is resumed (same questions after a page refresh)
  const again = await call("POST", "/api/student/final-assessment/start", {});
  assert.equal(again.json.attemptId, r.json.attemptId);
  // a new attempt after submitting is a different random draw with a NEW attempt id
  const firstKeys = attempts[0].questions.map((q) => q.key);
  await call("POST", "/api/student/final-assessment/submit", { attemptId: r.json.attemptId, answers: sheet(attempts[0], 4) });
  const next = await call("POST", "/api/student/final-assessment/start", {});
  assert.notEqual(next.json.attemptId, r.json.attemptId);
  assert.notDeepEqual(attempts.find((a) => a._id === next.json.attemptId).questions.map((q) => q.key), firstKeys);
});

test("5/10 (50%) fails, retake works, 6/10 (60%) passes, overwrites the failed result and locks permanently", async () => {
  reset(); await unlock();
  let start = (await call("POST", "/api/student/final-assessment/start", {})).json;
  // all 10 questions must be answered
  assert.equal((await call("POST", "/api/student/final-assessment/submit", { attemptId: start.attemptId, answers: [0, 1] })).status, 400);
  let r = await call("POST", "/api/student/final-assessment/submit", { attemptId: start.attemptId, answers: sheet(attempts[0], 5) });
  assert.equal(r.json.percent, 50); assert.equal(r.json.passed, false); assert.equal(r.json.certificate, null); assert.equal(certs.length, 0);
  assert.equal((await call("GET", "/api/student/final-assessment")).json.state, "failed");
  // submitting the same attempt again does not error and does not re-grade
  const dup = await call("POST", "/api/student/final-assessment/submit", { attemptId: start.attemptId, answers: sheet(attempts[0], 10) });
  assert.equal(dup.status, 200); assert.equal(dup.json.duplicate, true); assert.equal(dup.json.passed, false);

  const pointsBefore = progress.points;
  const retake = (await call("POST", "/api/student/final-assessment/start", {})).json;
  assert.notEqual(retake.attemptId, start.attemptId);
  r = await call("POST", "/api/student/final-assessment/submit", { attemptId: retake.attemptId, answers: sheet(attempts.find((a) => a._id === retake.attemptId), 6) });
  assert.equal(r.json.percent, 60); assert.equal(r.json.passed, true);
  assert.equal(attempts.length, 1); // the earlier failed result was overwritten
  assert.equal(r.json.certificate, null); // certificate is a separate explicit workflow
  assert.equal(progress.points - pointsBefore, 50);
  assert.equal(certs.length, 0);
  assert.equal((await call("POST", "/api/student/final-assessment/start", {})).status, 409); // permanently locked
  const s = (await call("GET", "/api/student/final-assessment")).json;
  assert.equal(s.state, "passed"); assert.equal(s.certificate, null);
  const generated = await call("POST", "/api/student/final-assessment/certificate", { name: "Siva" });
  assert.equal(generated.status, 201);
  assert.ok(!("certificateId" in generated.json.certificate)); // certificate numbers no longer exist
  assert.equal(generated.json.certificate.collegeName, "SSM Institute of Engineering and Technology (Autonomous)");
  assert.equal(generated.json.certificate.name, "Siva");
  assert.equal(generated.json.certificate.schoolName, STUDENT.schoolName);
  assert.equal(generated.json.certificate.standard, STUDENT.standard);
  assert.equal((await call("POST", "/api/student/final-assessment/certificate", { name: "Other Name" })).status, 200);
  assert.equal(certs.length, 1);
});

test("an attempt replaced by a newer one is rejected with a clear code, and never blocks a new attempt", async () => {
  reset(); await unlock();
  const old = (await call("POST", "/api/student/final-assessment/start", {})).json;
  attempts[0].createdAt = new Date(Date.now() - 4 * 3600 * 1000); // older than the resume window
  const fresh = (await call("POST", "/api/student/final-assessment/start", {})).json;
  assert.notEqual(fresh.attemptId, old.attemptId);
  const r = await call("POST", "/api/student/final-assessment/submit", { attemptId: old.attemptId, answers: Array(10).fill(0) });
  assert.equal(r.status, 409); assert.equal(r.json.fields.code, "ATTEMPT_EXPIRED");
});

test("certificate generation requires a pass, uses the edited name, and is idempotent", async () => {
  reset(); await unlock();
  const start = (await call("POST", "/api/student/final-assessment/start", {})).json;
  assert.equal((await call("POST", "/api/student/final-assessment/certificate", { name: "Siva K" })).status, 403);
  await call("POST", "/api/student/final-assessment/submit", { attemptId: start.attemptId, answers: sheet(attempts[0], 10) });
  assert.equal((await call("POST", "/api/student/final-assessment/certificate", { name: "A" })).status, 400);
  assert.equal((await call("POST", "/api/student/final-assessment/certificate", { name: "<b>x</b>" })).status, 400);
  const ok = await call("POST", "/api/student/final-assessment/certificate", { name: "  Sivakumar   R  " });
  assert.equal(ok.status, 201); assert.equal(ok.json.certificate.name, "Sivakumar R");
  const second = await call("POST", "/api/student/final-assessment/certificate", { name: "Someone Else" });
  assert.equal(second.status, 200); assert.equal(second.json.certificate.name, "Sivakumar R");
  assert.equal(certs.length, 1);
});

test("certificate cannot be generated before the final assessment is passed", async () => {
  reset();
  assert.equal((await call("POST", "/api/student/final-assessment/certificate", { name: "Siva K" })).status, 403);
});


test("a certificate request that loses a race returns the winner's certificate (idempotent, no error)", async () => {
  reset(); await unlock();
  const start = (await call("POST", "/api/student/final-assessment/start", {})).json;
  await call("POST", "/api/student/final-assessment/submit", { attemptId: start.attemptId, answers: sheet(attempts[0], 6) });
  forceCertCollision = true;
  const generated = await call("POST", "/api/student/final-assessment/certificate", { name: "Siva" });
  assert.equal(generated.status, 200);
  assert.equal(generated.json.created, false);
  assert.equal(generated.json.certificate.name, "Winner Name");
  assert.equal(certs.length, 1);
});
