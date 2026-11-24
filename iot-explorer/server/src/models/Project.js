import mongoose from "mongoose";

// Students only ever see projects with status "approved". Full project content is added in Part 3.
const projectSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    summary: { type: String, required: true, trim: true, maxlength: 400 },
    difficulty: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], default: "Beginner" },
    image: { type: String, default: "" },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "approved"], default: "pending", index: true },
  },
  { timestamps: true, collection: "projects" }
);

export default mongoose.model("Project", projectSchema);
