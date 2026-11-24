// OPTIONAL. Adds the 17 Simulation Lab projects to the Projects collection as APPROVED so the Student Dashboard and the
// Admin Portal (Projects, Reports) list them. Safe to run again. Existing projects and their status are never changed.
// Run: npm run seed:simulations
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { Project } from "../src/models/index.js";
import { SIMULATIONS } from "../src/data/activities.js";

await connectDB();
const base = await Project.countDocuments();
let added = 0;
for (const [i, s] of SIMULATIONS.entries()) {
  const r = await Project.updateOne(
    { slug: s.id },
    { $setOnInsert: { slug: s.id, title: s.name, summary: s.summary.slice(0, 400), difficulty: s.difficulty, image: "", order: base + i, status: "approved" } },
    { upsert: true }
  );
  if (r.upsertedCount) added++;
}
console.log(`Simulation projects: ${added} added, ${SIMULATIONS.length - added} already present.`);
await mongoose.disconnect();
