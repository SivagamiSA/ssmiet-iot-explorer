import mongoose from "mongoose";

// Append-only record of important admin actions (logins, and every later admin change).
// Never store passwords, tokens or other secrets in `summary` or `meta`.
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", index: true },
    actorEmail: { type: String, default: "", lowercase: true, trim: true, maxlength: 120 },
    actorRole: { type: String, default: "", maxlength: 20 },
    action: { type: String, required: true, trim: true, maxlength: 80, index: true }, // e.g. "admin.login"
    targetType: { type: String, default: "", maxlength: 40 },
    targetId: { type: String, default: "", maxlength: 80 },
    summary: { type: String, default: "", maxlength: 300 },
    meta: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String, default: "", maxlength: 60 },
    userAgent: { type: String, default: "", maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "auditlogs" }
);
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
