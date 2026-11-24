// READ-ONLY report of what already exists in the database. Run:  npm run db:counts
// Uses only count / find / aggregate on the native driver. It writes nothing and creates no indexes.
import { connectLean, disconnect } from "./_db.js";

const db = await connectLean();
const col = (n) => db.collection(n);
const by = async (name, field) => Object.fromEntries((await col(name).aggregate([{ $group: { _id: `$${field}`, n: { $sum: 1 } } }]).toArray()).map((r) => [String(r._id), r.n]));

try {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  console.log(`\nCollections present: ${[...existing].sort().join(", ") || "(none)"}\n`);

  console.log(`admins:   ${await col("admins").countDocuments({})}  (by adminRole: ${JSON.stringify(await by("admins", "adminRole"))}; "null" = field not set yet)`);
  console.log(`students: ${await col("students").countDocuments({})}  (active: ${await col("students").countDocuments({ isActive: true })})`);
  console.log(`events:   ${await col("events").countDocuments({})}  (by status: ${JSON.stringify(await by("events", "status"))})`);
  console.log(`projects: ${await col("projects").countDocuments({})}  (by status: ${JSON.stringify(await by("projects", "status"))})`);
  for (const p of await col("projects").find({}, { projection: { slug: 1, title: 1, status: 1, order: 1 } }).sort({ order: 1 }).toArray()) {
    console.log(`   - ${String(p.slug).padEnd(26)} ${String(p.status).padEnd(9)} ${p.title}`);
  }

  const schools = await col("students").aggregate([{ $group: { _id: "$schoolName", n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 60 }]).toArray();
  console.log(`\nDistinct student schoolName values (for the Phase 2 School backfill): ${schools.length}${schools.length === 60 ? "+" : ""}`);
  for (const s of schools) console.log(`   ${String(s.n).padStart(4)}  ${JSON.stringify(s._id)}`);
  console.log("\nNothing was modified.");
} finally {
  await disconnect();
}
