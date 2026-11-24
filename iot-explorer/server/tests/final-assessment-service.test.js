// Final assessment + certificate rules, run against an in-memory fake with real unique-index behaviour. Needs no database, Express or Mongoose.
import test from "node:test";
import assert from "node:assert/strict";
import { createFinalAssessmentService, isPassingScore } from "../src/services/finalAssessmentService.js";
import { POOL_BY_KEY } from "../src/data/finalAssessment.js";
import { createFakeDb } from "./_fakeDb.js";

const A = { _id: "st-1", name: "Siva", schoolName: "Govt Higher Secondary School", standard: 11 };
const B = { _id: "st-2", name: "Meena", schoolName: "St Mary's School", standard: 10 };
const quiet = { error() {}, warn() {}, log() {} };

function setup(opts) {
  const fake = createFakeDb(opts);
  fake.db.progress.quizResults = [{ quizId: "general", percent: 100 }, { quizId: "digital-dice", percent: 80 }]; // unlocked
  fake.db.progressByStudent = null;
  const svc = createFinalAssessmentService({ ...fake, log: quiet });
  return { ...fake, svc };
}
/** Answer sheet with exactly `right` correct answers, using the server-side attempt record as the answer key. */
const sheet = (db, attemptId, right) => db.attempts.find((a) => a._id === attemptId).questions.map((q, i) => {
  const correct = q.order.indexOf(POOL_BY_KEY.get(q.key).answer);
  return i < right ? correct : (correct + 1) % 4;
});
const attemptWith = async (svc, db, student, right) => {
  const s = await svc.startAttempt(student);
  return svc.submitAttempt(student, { attemptId: s.attemptId, answers: sheet(db, s.attemptId, right) });
};
const rejects = (p, status, code) => assert.rejects(p, (e) => e.status === status && (!code || e.fields?.code === code));

test("passing rule: 6/10 passes, 5/10 fails", () => {
  assert.equal(isPassingScore(6, 10), true); assert.equal(isPassingScore(5, 10), false); assert.equal(isPassingScore(10, 10), true); assert.equal(isPassingScore(0, 0), false);
});

test("1. new student starts: exactly 10 questions, no answers exposed, status not_started", async () => {
  const { svc } = setup();
  assert.equal((await svc.getStatus(A)).state, "not_started");
  const s = await svc.startAttempt(A);
  assert.equal(s.questions.length, 10);
  assert.ok(!/"answer"|correct_answer/.test(JSON.stringify(s)));
});

test("2. fewer than 10 answers (or blanks) are rejected and nothing is graded", async () => {
  const { svc, db } = setup();
  const s = await svc.startAttempt(A);
  await rejects(svc.submitAttempt(A, { attemptId: s.attemptId, answers: [0, 1, 2] }), 400, "INCOMPLETE");
  const nine = sheet(db, s.attemptId, 9).concat([null]);
  await rejects(svc.submitAttempt(A, { attemptId: s.attemptId, answers: nine }), 400, "INCOMPLETE");
  assert.equal(db.attempts[0].status, "open");
});

test("3-5. 5/10 fails, retake fails again, retake with 6/10 passes; only the latest result is kept", async () => {
  const { svc, db } = setup();
  let r = await attemptWith(svc, db, A, 5);
  assert.deepEqual([r.score, r.total, r.percent, r.passed], [5, 10, 50, false]);
  let st = await svc.getStatus(A);
  assert.deepEqual([st.state, st.lastScore, st.lastTotal, st.lastPercent, st.certificate], ["failed", 5, 10, 50, null]);
  r = await attemptWith(svc, db, A, 4); // fails again; start button must still work
  assert.equal(r.passed, false); assert.equal(r.attemptNumber, 2);
  assert.equal(db.attempts.length, 1); // replaced, not piled up
  r = await attemptWith(svc, db, A, 6);
  assert.deepEqual([r.score, r.percent, r.passed, r.pointsAwarded, r.attemptNumber], [6, 60, true, 50, 3]);
  assert.equal(db.attempts.length, 1);
  assert.equal(db.progress.points, 50);
});

test("6-9. 10/10 passes; status, restart and direct API use after the pass are all locked (backend)", async () => {
  const { svc, db } = setup();
  const r = await attemptWith(svc, db, A, 10);
  assert.deepEqual([r.percent, r.passed], [100, true]);
  for (let i = 0; i < 2; i++) { // "refresh" and "logout/login" are just fresh status reads
    const st = await svc.getStatus(A);
    assert.deepEqual([st.state, st.passed, st.lastScore], ["passed", true, 10]);
  }
  await rejects(svc.startAttempt(A), 409, "ALREADY_PASSED");
  // a leftover unfinished attempt cannot be graded after the pass either
  db.attempts.push({ _id: "stale", student: A._id, status: "open", passed: false, createdAt: new Date(), questions: db.attempts[0].questions });
  await rejects(svc.submitAttempt(A, { attemptId: "stale", answers: Array(10).fill(0) }), 409, "ALREADY_PASSED");
  assert.equal(db.progress.points, 50); // points awarded only once
});

test("a student cannot submit someone else's attempt", async () => {
  const { svc, db } = setup();
  const s = await svc.startAttempt(A);
  await rejects(svc.submitAttempt(B, { attemptId: s.attemptId, answers: sheet(db, s.attemptId, 10) }), 404, "ATTEMPT_NOT_FOUND");
});

test("duplicate submit returns the stored result; replaced attempt gives ATTEMPT_EXPIRED", async () => {
  const { svc, db } = setup();
  const s = await svc.startAttempt(A);
  const answers = sheet(db, s.attemptId, 5);
  await svc.submitAttempt(A, { attemptId: s.attemptId, answers });
  const again = await svc.submitAttempt(A, { attemptId: s.attemptId, answers: sheet(db, s.attemptId, 10) });
  assert.equal(again.duplicate, true); assert.equal(again.passed, false);
  db.attempts.push({ _id: "old", student: A._id, status: "expired", questions: [], passed: false });
  await rejects(svc.submitAttempt(A, { attemptId: "old", answers: Array(10).fill(0) }), 409, "ATTEMPT_EXPIRED");
});

test("an unfinished attempt is resumed (same id, same questions) after a refresh", async () => {
  const { svc } = setup();
  const one = await svc.startAttempt(A); const two = await svc.startAttempt(A);
  assert.equal(two.attemptId, one.attemptId); assert.deepEqual(two.questions, one.questions);
});

test("not eligible students cannot start", async () => {
  const { svc, db } = setup(); db.progress.quizResults = [{ quizId: "general", percent: 100 }];
  await rejects(svc.startAttempt(A), 403, "NOT_ELIGIBLE");
});

test("10-11. certificate: needs a pass, uses the edited name, has NO number, and repeat requests return the same one", async () => {
  const { svc, db } = setup();
  await rejects(svc.generateCertificate(A, { name: "Siva K" }), 403, "NOT_PASSED");
  await attemptWith(svc, db, A, 6);
  await assert.rejects(svc.generateCertificate(A, { name: "A" }), (e) => e.status === 400);
  await assert.rejects(svc.generateCertificate(A, { name: "<b>x</b>" }), (e) => e.status === 400);
  const first = await svc.generateCertificate(A, { name: "  Sivakumar   R  " });
  assert.equal(first.created, true);
  assert.deepEqual(Object.keys(first.certificate).sort(), ["collegeName", "issuedAt", "name", "nameLocked", "percent", "schoolName", "standard", "title"]);
  assert.equal(first.certificate.name, "Sivakumar R");
  assert.equal(first.certificate.schoolName, A.schoolName); assert.equal(first.certificate.standard, 11);
  assert.equal(first.certificate.collegeName, "SSM Institute of Engineering and Technology (Autonomous)");
  assert.ok(!/certificateId|IOTX/i.test(JSON.stringify([first, db.certs])));
  const second = await svc.generateCertificate(A, { name: "Someone Else" });
  assert.equal(second.created, false); assert.equal(second.certificate.name, "Sivakumar R");
  assert.equal(db.certs.length, 1);
  assert.equal((await svc.getStatus(A)).certificate.name, "Sivakumar R"); // same after refresh / login
});

test("simultaneous certificate requests create exactly one certificate", async () => {
  const { svc, db } = setup();
  await attemptWith(svc, db, A, 8);
  const results = await Promise.all(Array.from({ length: 6 }, () => svc.generateCertificate(A, { name: "Siva K" })));
  assert.equal(db.certs.length, 1);
  assert.equal(results.filter((r) => r.created).length, 1);
  assert.ok(db.certCreates > 1); // the race really happened
  assert.ok(results.every((r) => r.certificate.name === "Siva K"));
});

test("simultaneous Start clicks give one open attempt", async () => {
  const { svc, db } = setup();
  const res = await Promise.all([svc.startAttempt(A), svc.startAttempt(A), svc.startAttempt(A)]);
  assert.equal(db.attempts.filter((a) => a.status === "open").length, 1);
  assert.equal(new Set(res.map((r) => r.attemptId)).size, 1);
});

test("12. two students generate certificates independently and never see each other's", async () => {
  const { svc, db } = setup();
  await attemptWith(svc, db, A, 7); await attemptWith(svc, db, B, 10);
  const [ca, cb] = await Promise.all([svc.generateCertificate(A, { name: "Siva K" }), svc.generateCertificate(B, { name: "Meena S" })]);
  assert.equal(db.certs.length, 2);
  assert.deepEqual([ca.certificate.name, ca.certificate.schoolName, cb.certificate.name, cb.certificate.schoolName], ["Siva K", A.schoolName, "Meena S", B.schoolName]);
  assert.equal((await svc.getStatus(A)).certificate.name, "Siva K");
});

test("a leftover legacy unique certificateId index gives a clear repair message instead of retry loops or 'number could not be allocated'", async () => {
  const { svc, db } = setup({ legacyCertificateIdIndex: true });
  db.certs.push({ student: "someone-else", quizId: "general", title: "old" }); // an old document without certificateId already occupies the null key
  await attemptWith(svc, db, A, 6);
  await assert.rejects(svc.generateCertificate(A, { name: "Siva K" }), (e) => e.status === 500 && e.fields.code === "CERTIFICATE_INDEX_CONFLICT" && !/number could not/i.test(e.message));
  assert.equal(db.certCreates, 1); // exactly one insert attempt, no retry loop
});

test("a repaired legacy pass row is history and survives later cleanup", async () => {
  const { svc, db } = setup();
  db.attempts.push({ _id: "hist", student: A._id, status: "expired", passed: false, wasPassed: true, expiredReason: "duplicate_pass_repair", questions: [] });
  await attemptWith(svc, db, A, 4); // student with no pass fails -> failed results get replaced, but the repair row stays
  assert.ok(db.attempts.some((a) => a._id === "hist"));
});
