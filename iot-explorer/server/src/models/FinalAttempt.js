import mongoose from "mongoose";

// One document per run of the final assessment: which 10 questions were drawn (and the option order shown),
// so grading happens on the server and the browser never holds the answer key.
//
// Result handling: a student has at most ONE graded ("submitted") document - the CURRENT result.
// Submitting a new attempt overwrites (replaces) the previous failed result. Once passed = true the student is locked out
// of further attempts (enforced in routes/finalAssessment.js and by the unique index below).
const attemptSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    questions: [{ _id: false, key: String, order: [String] }],
    // open = in progress, submitted = graded, expired = superseded by a newer attempt or timed out (never graded)
    status: { type: String, enum: ["open", "submitted", "expired"], default: "open" },
    attemptNumber: { type: Number, default: 1 }, // 1st, 2nd, 3rd ... try of this student
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    answers: { type: [Number], default: [] },
    submittedAt: Date,
    completedAt: Date, // set only when passed: the completion date printed on the certificate
    // Set only by the database repair (db/maintenance.js) on an OLDER duplicate passing row: it is kept as history, never deleted, and no longer counts as a pass.
    wasPassed: { type: Boolean, default: undefined },
    expiredReason: { type: String, default: undefined },
    repairedAt: { type: Date, default: undefined },
  },
  // autoIndex is off for this schema on purpose: db/maintenance.js repairs legacy duplicate rows FIRST and then creates the unique indexes below.
  { timestamps: true, collection: "finalattempts", autoIndex: false }
);

// Concurrent-attempt guard: only one in-progress attempt per student, even if two Start requests race.
attemptSchema.index({ student: 1 }, { unique: true, partialFilterExpression: { status: "open" }, name: "one_open_attempt_per_student" });
// Permanent-pass guard: a student can only ever have one passing result (older duplicates are marked expired by the repair, never deleted).
attemptSchema.index({ student: 1 }, { unique: true, partialFilterExpression: { passed: true }, name: "one_pass_per_student" });

export default mongoose.model("FinalAttempt", attemptSchema);
