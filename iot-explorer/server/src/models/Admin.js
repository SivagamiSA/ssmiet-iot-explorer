import mongoose from "mongoose";
import { ADMIN_ROLES, PERMISSIONS } from "../utils/permissions.js";

// Admins are created ONLY with `npm run create-admin`. There is no public admin registration.
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, default: "admin", immutable: true },
    isActive: { type: Boolean, default: true },
    // Admin Portal (Phase 1). `role` above stays "admin" for every admin so existing tokens and guards keep working.
    // Accounts created before Phase 1 simply read as adminRole "admin" with no permissions until a Super Admin grants some.
    adminRole: { type: String, enum: ADMIN_ROLES, default: "admin", index: true },
    permissions: { type: [{ type: String, enum: PERMISSIONS }], default: [] },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, collection: "admins" }
);

export default mongoose.model("Admin", adminSchema);
