// Links existing students to School records (schoolId) WITHOUT changing or deleting schoolName.
//   npm run migrate:schools            -> DRY RUN: prints what would happen, writes nothing
//   npm run migrate:schools -- --apply -> saves a JSON backup of students first, then creates schools and links students
// Names that differ only by case/spacing ("ABC School" / "abc  school") are treated as the same school.
import fs from "node:fs";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { Student, School } from "../src/models/index.js";
import { nameKeyOf } from "../src/models/School.js";

const apply = process.argv.includes("--apply");
await connectDB();

const students = await Student.find({ schoolId: null }).select("schoolName").lean();
const groups = new Map(); // nameKey -> { spellings: Map(spelling -> count), ids: [] }
for (const s of students) {
  const key = nameKeyOf(s.schoolName);
  if (!key) continue;
  const g = groups.get(key) ?? { spellings: new Map(), ids: [] };
  const sp = String(s.schoolName).trim().replace(/\s+/g, " ");
  g.spellings.set(sp, (g.spellings.get(sp) ?? 0) + 1);
  g.ids.push(s._id);
  groups.set(key, g);
}
const existing = new Map((await School.find().select("+nameKey name").lean()).map((x) => [x.nameKey, x]));
const empty = students.filter((s) => !nameKeyOf(s.schoolName)).length;

console.log(`${apply ? "APPLY" : "DRY RUN"}: ${students.length} unlinked student(s), ${groups.size} distinct school name(s), ${existing.size} school record(s) already exist.`);
for (const [key, g] of groups) {
  const best = [...g.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const variants = g.spellings.size > 1 ? `  (spellings: ${[...g.spellings.keys()].join(" | ")})` : "";
  console.log(` - "${existing.get(key)?.name ?? best}": ${g.ids.length} student(s) -> ${existing.has(key) ? "link to existing school" : "create school + link"}${variants}`);
}
if (empty) console.log(`Unmatched: ${empty} student(s) have an empty school name and will stay unlinked.`);

if (!apply) { console.log("\nNothing was written. Review the list, then run: npm run migrate:schools -- --apply"); await mongoose.disconnect(); process.exit(0); }

const file = `students-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(file, JSON.stringify(await Student.find().lean(), null, 2)); // passwordHash is select:false, so password hashes are NOT written to this file
console.log(`Backup saved: ${file}`);

let created = 0, linked = 0;
for (const [key, g] of groups) {
  let school = existing.get(key);
  if (!school) {
    const best = [...g.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0];
    school = await School.create({ name: best }); created++;
  }
  const r = await Student.updateMany({ _id: { $in: g.ids }, schoolId: null }, { $set: { schoolId: school._id } }); // schoolName left untouched
  linked += r.modifiedCount;
}
console.log(`Done. Schools created: ${created}. Students linked: ${linked}. schoolName values were not changed.`);
await mongoose.disconnect();
