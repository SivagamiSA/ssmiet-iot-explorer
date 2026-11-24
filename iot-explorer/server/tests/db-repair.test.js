// Database repair logic against fake collections (no database needed).
import test from "node:test";
import assert from "node:assert/strict";
import { repairFinalAttempts, repairCertificates, ensureAssessmentIndexes } from "../src/db/maintenance.js";
import { match } from "./_fakeDb.js";

function fakeCol(docs, indexes = []) {
  const col = {
    docs, indexes: [...indexes], dropped: [],
    find: (f) => ({ toArray: async () => col.docs.filter((d) => match(d, f)) }),
    updateMany: async (f, u) => { col.docs.filter((d) => match(d, f)).forEach((d) => Object.assign(d, u.$set)); return {}; },
    indexes: async () => col.indexList,
    dropIndex: async (n) => { col.dropped.push(n); col.indexList = col.indexList.filter((i) => i.name !== n); },
    indexList: indexes,
  };
  return col;
}
const at = (id, student, extra) => ({ _id: id, student, status: "submitted", passed: true, percent: 80, ...extra });

test("13. duplicate passing records: newest valid pass is kept, older ones expired (not deleted), other students untouched", async () => {
  const col = fakeCol([
    at("a1", "s1", { submittedAt: new Date("2026-01-01") }),
    at("a2", "s1", { submittedAt: new Date("2026-03-01") }),   // newest -> kept
    at("a3", "s1", { submittedAt: new Date("2026-02-01") }),
    at("b1", "s2", { submittedAt: new Date("2026-01-01") }),   // single pass -> untouched
    at("b2", "s2", { passed: false, percent: 40 }),
    at("c1", "s3", { status: "open", submittedAt: new Date("2026-05-01") }), // not properly graded
    at("c2", "s3", { submittedAt: new Date("2026-01-01") }),   // graded pass beats an "open" row even if older
  ]);
  const before = col.docs.length;
  const r = await repairFinalAttempts(col, { now: () => new Date("2026-06-01") });
  assert.deepEqual([r.duplicatePassStudents, r.passesExpired], [2, 3]);
  assert.equal(col.docs.length, before); // nothing deleted
  const get = (id) => col.docs.find((d) => d._id === id);
  assert.equal(get("a2").passed, true);
  for (const id of ["a1", "a3", "c1"]) { assert.equal(get(id).passed, false); assert.equal(get(id).status, "expired"); assert.equal(get(id).wasPassed, true); assert.equal(get(id).expiredReason, "duplicate_pass_repair"); }
  assert.equal(get("c2").passed, true); assert.equal(get("b1").passed, true); assert.equal(get("b2").passed, false);
  // exactly one pass per student now, so the unique index can be built
  const perStudent = {}; col.docs.filter((d) => d.passed).forEach((d) => { perStudent[d.student] = (perStudent[d.student] ?? 0) + 1; });
  assert.ok(Object.values(perStudent).every((n) => n === 1));
  // repeatable: a second run changes nothing
  assert.deepEqual(await repairFinalAttempts(col), { duplicatePassStudents: 0, passesExpired: 0, duplicateOpenStudents: 0, opensExpired: 0 });
});

test("duplicate open attempts: newest stays open, others expired", async () => {
  const col = fakeCol([
    { _id: "o1", student: "s1", status: "open", createdAt: new Date("2026-01-01") },
    { _id: "o2", student: "s1", status: "open", createdAt: new Date("2026-02-01") },
  ]);
  const r = await repairFinalAttempts(col);
  assert.equal(r.opensExpired, 1);
  assert.equal(col.docs.find((d) => d._id === "o2").status, "open"); assert.equal(col.docs.find((d) => d._id === "o1").status, "expired");
});

test("dry run reports but changes nothing", async () => {
  const col = fakeCol([at("a1", "s1", { submittedAt: new Date(1) }), at("a2", "s1", { submittedAt: new Date(2) })]);
  const r = await repairFinalAttempts(col, { dryRun: true });
  assert.equal(r.passesExpired, 1); assert.ok(col.docs.every((d) => d.passed));
});

test("certificates: only the legacy certificateId index is dropped; other unique indexes are reported; documents untouched", async () => {
  const col = fakeCol(
    [{ _id: 1, student: "s1", quizId: "final-assessment", certificateId: "IOTX-1" }, { _id: 2, student: "s2", quizId: "general" }],
    [{ name: "_id_", key: { _id: 1 } }, { name: "certificateId_1", key: { certificateId: 1 }, unique: true },
     { name: "one_final_certificate_per_student", key: { student: 1, quizId: 1 }, unique: true }, { name: "weird_1", key: { percent: 1 }, unique: true }]);
  const r = await repairCertificates(col);
  assert.deepEqual(r.droppedIndexes, ["certificateId_1"]); assert.deepEqual(col.dropped, ["certificateId_1"]);
  assert.deepEqual(r.unexpectedUniqueIndexes.map((i) => i.name), ["weird_1"]);
  assert.equal(col.docs.length, 2); // certificates preserved
  // an explicit, named drop works, but never for the expected or _id index
  const r2 = await repairCertificates(col, { dropIndexNames: ["weird_1", "_id_", "one_final_certificate_per_student"] });
  assert.deepEqual(r2.droppedIndexes, ["weird_1"]);
});

test("certificates: duplicate final certificates are reported, never deleted; missing collection is fine", async () => {
  const col = fakeCol([{ _id: 1, student: "s1", quizId: "final-assessment" }, { _id: 2, student: "s1", quizId: "final-assessment" }]);
  const r = await repairCertificates(col);
  assert.deepEqual(r.duplicateFinalCertificateStudents, ["s1"]); assert.equal(col.docs.length, 2);
  col.indexes = async () => { throw Object.assign(new Error("ns not found"), { codeName: "NamespaceNotFound" }); };
  assert.deepEqual((await repairCertificates(col)).droppedIndexes, []);
});

test("index creation errors are returned, not thrown", async () => {
  const ok = { createIndexes: async () => {} }, bad = { createIndexes: async () => { throw new Error("E11000 one_pass_per_student"); } };
  assert.deepEqual(await ensureAssessmentIndexes({ Certificate: ok, FinalAttempt: ok }), []);
  const errs = await ensureAssessmentIndexes({ Certificate: ok, FinalAttempt: bad });
  assert.equal(errs.length, 1); assert.equal(errs[0].collection, "finalattempts");
});
