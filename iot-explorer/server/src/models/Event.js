import mongoose from "mongoose";

// Students only ever see events with status "published". Admins create them in a later stage.
const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    date: { type: Date, required: true, index: true },
    location: { type: String, default: "", trim: true, maxlength: 140 },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
  },
  { timestamps: true, collection: "events" }
);

export default mongoose.model("Event", eventSchema);
