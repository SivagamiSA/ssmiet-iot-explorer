// Tiny in-memory stand-in for the Mongoose models, with the SAME unique-index behaviour as the real indexes
// (one open attempt per student, one pass per student, one final certificate per student, optional LEGACY unique certificateId index).
const dup = (keyPattern) => Object.assign(new Error("E11000 duplicate key error"), { code: 11000, keyPattern });
const cmp = (o, k, v) => {
  if (v && typeof v === "object" && !(v instanceof Date)) {
    if ("$ne" in v) return o[k] !== v.$ne;
    if ("$gte" in v) return o[k] >= v.$gte;
    if ("$exists" in v) return (o[k] !== undefined) === v.$exists;
    if ("$in" in v) return v.$in.includes(o[k]);
  }
  return o[k] === v;
};
export const match = (o, f) => Object.entries(f).every(([k, v]) => cmp(o, k, v));

class Query {
  constructor(run) { this.run = run; this.sortKey = null; }
  sort(s) { this.sortKey = s; return this; }
  lean() { return this; }
  then(a, b) { return this.exec().then(a, b); }
  catch(f) { return this.exec().catch(f); }
  async exec() {
    await Promise.resolve(); // yield, so simultaneous requests really interleave
    const rows = this.run();
    if (!Array.isArray(rows)) return rows ?? null;
    return rows;
  }
}
const newestFirst = (rows, sort) => {
  if (!sort) return rows;
  const [k, dir] = Object.entries(sort)[0];
  return [...rows].sort((a, b) => (a[k] < b[k] ? 1 : a[k] > b[k] ? -1 : 0) * (dir === 1 ? -1 : 1));
};

export function createFakeDb({ legacyCertificateIdIndex = false } = {}) {
  const db = { progress: { quizResults: [], points: 0 }, attempts: [], certs: [], seq: 0, certCreates: 0 };

  const StudentProgress = {
    findOne: () => new Query(() => db.progress),
    updateOne: async (_f, u) => { if (u.$inc?.points) db.progress.points += u.$inc.points; return {}; },
  };

  const one = (list, f, sort) => newestFirst(list.filter((x) => match(x, f)), sort)[0] ?? null;
  const FinalAttempt = {
    create: async (d) => {
      await Promise.resolve();
      if (db.attempts.some((a) => a.student === d.student && a.status === "open")) throw dup({ student: 1 });
      const a = { _id: `at-${++db.seq}`, status: "open", passed: false, createdAt: new Date(Date.now() + db.seq), ...d };
      db.attempts.push(a); return a;
    },
    findOneAndUpdate: (f, u) => new Query(() => {
      const a = db.attempts.find((x) => match(x, f));
      if (!a) return null;
      if (u.$set.passed && db.attempts.some((x) => x !== a && x.student === a.student && x.passed)) throw dup({ student: 1 }); // one_pass_per_student
      Object.assign(a, u.$set); return a;
    }),
    updateMany: async (f, u) => { db.attempts.filter((a) => match(a, f)).forEach((a) => Object.assign(a, u.$set)); return {}; },
    deleteMany: async (f) => { db.attempts = db.attempts.filter((a) => !match(a, f)); return {}; },
  };
  FinalAttempt.findOne = (f) => { const q = new Query(() => one(db.attempts, f, q.sortKey)); return q; };

  const Certificate = {
    findOne: (f) => { const q = new Query(() => one(db.certs, f, q.sortKey)); return q; },
    create: async (d) => {
      db.certCreates += 1;
      await Promise.resolve(); await Promise.resolve(); // widen the race window
      if (d.quizId === "final-assessment" && db.certs.some((c) => c.student === d.student && c.quizId === d.quizId)) throw dup({ student: 1, quizId: 1 });
      if (legacyCertificateIdIndex && db.certs.some((c) => (c.certificateId ?? null) === (d.certificateId ?? null))) throw dup({ certificateId: 1 });
      const c = { nameLocked: false, ...d }; db.certs.push(c); return { toObject: () => c };
    },
  };
  return { db, StudentProgress, FinalAttempt, Certificate };
}
