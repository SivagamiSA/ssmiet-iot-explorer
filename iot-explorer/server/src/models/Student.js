import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    schoolName: { type: String, required: true, trim: true, maxlength: 120 }, // kept for compatibility; schoolId is the real link
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null, index: true },
    standard: { type: Number, required: true, enum: [8, 9, 10, 11, 12] },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true, select: false }, // never returned by queries unless asked
    role: { type: String, default: "student", immutable: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "students" }
);

export default mongoose.model("Student", studentSchema);
