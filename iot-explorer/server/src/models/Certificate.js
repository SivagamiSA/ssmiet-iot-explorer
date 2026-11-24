import mongoose from "mongoose";

// Created when a student generates the FINAL ASSESSMENT certificate (quizId "final-assessment") after passing.
// Certificates have NO certificate number. Older documents may still carry a legacy `certificateId` value; it is ignored
// (never read, never returned, never required) and the old unique index on it is removed by the database repair (db/maintenance.js).
// Older per-quiz certificates may also still exist but are no longer issued.
const certificateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    title: { type: String, required: true, trim: true },
    quizId: { type: String, default: "" },
    percent: { type: Number, default: 0 },
    // The name printed on the certificate. Starts as the login name; the student can change it before generating, then it is locked.
    recipientName: { type: String, default: "", trim: true, maxlength: 80 },
    nameLocked: { type: Boolean, default: false },
    nameSetAt: { type: Date, default: null },
    issuedAt: { type: Date, default: Date.now },
  },
  // autoIndex is off for this schema on purpose: db/maintenance.js repairs legacy data / indexes FIRST and then creates these indexes in a fixed order.
  { timestamps: true, collection: "certificates", autoIndex: false }
);

// One final-assessment certificate per student; legacy per-quiz certificates remain unaffected.
certificateSchema.index(
  { student: 1, quizId: 1 },
  { unique: true, partialFilterExpression: { quizId: "final-assessment" }, name: "one_final_certificate_per_student" }
);

export default mongoose.model("Certificate", certificateSchema);
