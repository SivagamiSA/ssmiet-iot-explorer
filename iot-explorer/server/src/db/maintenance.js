// Safe, repeatable repair of the final-assessment / certificate collections. Used at server start (config/db.js) and by
// `npm run db:repair-assessment`. It never deletes documents or collections and never drops an index it was not told about:
//  - older duplicate PASSING attempts of one student are marked expired (kept as history), the newest valid pass stays;
//  - duplicate OPEN attempts of one student are expired, the newest stays;
//  - the old unique index on certificates.certificateId (certificate numbers were removed) is dropped;
//  - other unexpected unique indexes are only REPORTED (drop one deliberately with --drop-index=<name>);
//  - then the required indexes are created.
// `col` arguments are native driver collections (find().toArray, updateMany, indexes, dropIndex), so tests can fake them.

const byStudent = (rows) => {
  const m = new Map();
  for (const r of rows) { const k = String(r.student); if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
  return m;
};
const ts = (d) => (d ? new Date(d).getTime() : 0);
const desc = (a, b) => (a < b ? 1 : a > b ? -1 : 0);

/** Newest first: a properly graded ("submitted") pass beats anything else, then latest submission / update / creation, then _id. */
const rankPasses = (rows) => [...rows].sort((a, b) =>
  desc(a.status === "submitted" ? 1 : 0, b.status === "submitted" ? 1 : 0) ||
  desc(ts(a.submittedAt), ts(b.submittedAt)) || desc(ts(a.updatedAt), ts(b.updatedAt)) || desc(ts(a.createdAt), ts(b.createdAt)) ||
  desc(String(a._id), String(b._id)));

export async function repairFinalAttempts(col, { dryRun = false, now = () => new Date() } = {}) {
  const report = { duplicatePassStudents: 0, passesExpired: 0, duplicateOpenStudents: 0, opensExpired: 0 };

  const passIds = [];
  for (const rows of byStudent(await col.find({ passed: true }).toArray()).values()) {
    if (rows.length < 2) continue;
    report.duplicatePassStudents += 1;
    passIds.push(...rankPasses(rows).slice(1).map((r) => r._id)); // index 0 = the latest valid pass, which is kept
  }
  if (passIds.length) {
    report.passesExpired = passIds.length;
    if (!dryRun) await col.updateMany({ _id: { $in: passIds } }, { $set: { passed: false, wasPassed: true, status: "expired", expiredReason: "duplicate_pass_repair", repairedAt: now() } });
  }

  const openIds = [];
  for (const rows of byStudent(await col.find({ status: "open" }).toArray()).values()) {
    if (rows.length < 2) continue;
    report.duplicateOpenStudents += 1;
    const newest = [...rows].sort((a, b) => desc(ts(a.createdAt), ts(b.createdAt)) || desc(String(a._id), String(b._id)));
    openIds.push(...newest.slice(1).map((r) => r._id));
  }
  if (openIds.length) {
    report.opensExpired = openIds.length;
    if (!dryRun) await col.updateMany({ _id: { $in: openIds } }, { $set: { status: "expired", passed: false, expiredReason: "duplicate_open_repair", repairedAt: now() } });
  }
  return report;
}

const EXPECTED_CERT_INDEXES = new Set(["_id_", "one_final_certificate_per_student"]);
const isLegacyNumberIndex = (ix) => { const k = Object.keys(ix.key ?? {}); return k.length === 1 && (k[0] === "certificateId" || k[0] === "certId"); };

export async function repairCertificates(col, { dryRun = false, dropIndexNames = [] } = {}) {
  const report = { droppedIndexes: [], unexpectedUniqueIndexes: [], duplicateFinalCertificateStudents: [] };
  let indexes = [];
  try { indexes = await col.indexes(); } catch (e) { if (e?.codeName !== "NamespaceNotFound" && e?.code !== 26) throw e; } // no collection yet: nothing to repair

  for (const ix of indexes) {
    if (isLegacyNumberIndex(ix) || (dropIndexNames.includes(ix.name) && !EXPECTED_CERT_INDEXES.has(ix.name))) {
      if (!dryRun) await col.dropIndex(ix.name);
      report.droppedIndexes.push(ix.name);
    } else if (ix.unique && !EXPECTED_CERT_INDEXES.has(ix.name)) {
      report.unexpectedUniqueIndexes.push({ name: ix.name, key: ix.key });
    }
  }
  // Duplicate final certificates would block the unique index. They are reported, never deleted (certificates are preserved).
  for (const [student, rows] of byStudent(await col.find({ quizId: "final-assessment" }).toArray())) if (rows.length > 1) report.duplicateFinalCertificateStudents.push(student);
  return report;
}

/** Creates the required indexes (after the repairs above). Errors are returned, not thrown, so one bad index cannot stop the server. */
export async function ensureAssessmentIndexes({ Certificate, FinalAttempt }) {
  const errors = [];
  for (const [label, model] of [["certificates", Certificate], ["finalattempts", FinalAttempt]]) {
    try { await model.createIndexes(); } catch (e) { errors.push({ collection: label, message: e.message }); }
  }
  return errors;
}

export async function runAssessmentRepair(db, models, opts = {}) {
  const attempts = await repairFinalAttempts(db.collection("finalattempts"), opts);
  const certificates = await repairCertificates(db.collection("certificates"), opts);
  const indexErrors = opts.dryRun ? [] : await ensureAssessmentIndexes(models);
  return { attempts, certificates, indexErrors };
}

export function describeRepair(r, log = console) {
  const { attempts: a, certificates: c, indexErrors } = r;
  if (a.passesExpired) log.warn(`[db] ${a.duplicatePassStudents} student(s) had several passing records: kept the newest, marked ${a.passesExpired} older one(s) expired (history kept).`);
  if (a.opensExpired) log.warn(`[db] Expired ${a.opensExpired} duplicate unfinished attempt(s).`);
  if (c.droppedIndexes.length) log.warn(`[db] Dropped legacy certificate index(es): ${c.droppedIndexes.join(", ")}.`);
  for (const u of c.unexpectedUniqueIndexes) log.warn(`[db] Unexpected unique index "${u.name}" on certificates (${JSON.stringify(u.key)}). If it blocks certificates, drop it with: npm run db:repair-assessment -- --drop-index=${u.name}`);
  if (c.duplicateFinalCertificateStudents.length) log.warn(`[db] ${c.duplicateFinalCertificateStudents.length} student(s) have more than one final certificate; none were deleted. Resolve manually so the one-per-student index can be built.`);
  for (const e of indexErrors) log.error(`[db] Could not create indexes on ${e.collection}: ${e.message}`);
}
