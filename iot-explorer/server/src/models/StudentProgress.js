import mongoose from "mongoose";

// One document per student: everything the dashboard needs. Later parts update it
// (lessons in Part 2, simulations in Part 3, quizzes in Part 4).
const progressSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
    points: { type: Number, default: 0, min: 0 },
    completedLessons: [{ _id: false, lessonId: String, completedAt: { type: Date, default: Date.now } }],
    // One row per project simulation (slug = the project's slug).
    simulations: [{ _id: false, projectSlug: String, attempts: { type: Number, default: 0 }, bestScore: { type: Number, default: 0 }, completed: { type: Boolean, default: false }, lastAttemptAt: Date }],
    quizResults: [{ _id: false, quizId: String, score: Number, total: Number, percent: Number, takenAt: { type: Date, default: Date.now } }],
  },
  { timestamps: true, collection: "studentprogress" }
);

export default mongoose.model("StudentProgress", progressSchema);
