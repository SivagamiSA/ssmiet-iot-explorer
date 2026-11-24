// Copies the 30 learning components from src/learn/data.ts into the `components` collection so admins can manage them.
// Safe to run again: existing documents are NOT overwritten (admin edits are kept); only missing components are added.
// Needs Node 22.18+ (it reads the TypeScript data file directly).   Run: npm run seed:components
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { Component } from "../src/models/index.js";

const { LEARN } = await import("../../src/learn/data.ts").catch((e) => {
  console.error("Could not read src/learn/data.ts. Use Node 22.18 or newer (node -v).\n", e.message);
  process.exit(1);
});

await connectDB();
let added = 0;
for (const [i, c] of LEARN.entries()) {
  const r = await Component.updateOne({ slug: c.slug }, { $setOnInsert: {
    slug: c.slug, name: c.name, category: c.cat, image: c.img, kind: c.kind, summary: c.summary, tip: c.tip,
    uses: c.uses, steps: c.steps, pins: c.pins.map(([name, note]) => ({ name, note })),
    wire: c.wire.map(([from, to, color]) => ({ from, to, color })), order: i, isVisible: true,
  } }, { upsert: true });
  if (r.upsertedCount) added++;
}
console.log(`Components in source: ${LEARN.length}. Added: ${added}. Already present: ${LEARN.length - added}. In database now: ${await Component.countDocuments()}.`);
await mongoose.disconnect();
