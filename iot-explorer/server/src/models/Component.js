import mongoose from "mongoose";

// Admin-managed copy of the 30 learning components. It is filled ONCE from src/learn/data.ts by `npm run seed:components`
// (nothing is invented). Quiz questions are NOT stored here: quizzes are a separate module.
const componentSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 40, index: true },
    image: { type: String, default: "", maxlength: 200 },
    kind: { type: String, default: "flow", maxlength: 20 }, // which animated scene the Explorer draws
    summary: { type: String, default: "", trim: true, maxlength: 400 },
    tip: { type: String, default: "", trim: true, maxlength: 400 },
    uses: { type: [String], default: [] },
    steps: { type: [String], default: [] },
    pins: { type: [new mongoose.Schema({ _id: false, name: { type: String, maxlength: 80 }, note: { type: String, maxlength: 400 } })], default: [] },
    wire: { type: [new mongoose.Schema({ _id: false, from: { type: String, maxlength: 80 }, to: { type: String, maxlength: 80 }, color: { type: String, maxlength: 20 } })], default: [] },
    order: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "components" }
);

export default mongoose.model("Component", componentSchema);
