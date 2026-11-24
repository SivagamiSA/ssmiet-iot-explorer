import mongoose from "mongoose";

// Platform-wide switches, one document with key "platform". Only the Super Admin can change them.
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    registrationOpen: { type: Boolean, default: true }, // false = new student sign-ups are paused
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true, collection: "settings" }
);

export default mongoose.model("Setting", settingSchema);
