import mongoose from "mongoose";

/** Lower-case, trimmed, single-spaced version of a name. Used to stop duplicate schools. */
export const nameKeyOf = (name) => String(name ?? "").trim().replace(/\s+/g, " ").toLowerCase();

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    nameKey: { type: String, required: true, unique: true, select: false },
    city: { type: String, default: "", trim: true, maxlength: 80 },
    district: { type: String, default: "", trim: true, maxlength: 80 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "schools" }
);

schoolSchema.pre("validate", function setKey(next) {
  this.name = String(this.name ?? "").trim().replace(/\s+/g, " ");
  this.nameKey = nameKeyOf(this.name);
  next();
});

export default mongoose.model("School", schoolSchema);
