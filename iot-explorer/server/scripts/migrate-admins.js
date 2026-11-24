// Promotes ONE designated admin to Super Admin. Safe by design:
//   - dry run by default (changes nothing until you add --apply)
//   - touches only that one admin document, only the `adminRole` field
//   - saves a backup file first, and --rollback restores the exact previous state
//
//   npm run migrate-admins -- --email you@example.com            (preview)
//   npm run migrate-admins -- --email you@example.com --apply    (do it)
//   npm run migrate-admins -- --rollback server/scripts/backups/<file>.json [--apply]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectLean, disconnect, mongoose } from "./_db.js";
import { planPromotion, buildBackup, planRollback } from "./_adminMigration.js";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const apply = flag("--apply");
const here = path.dirname(fileURLToPath(import.meta.url));

const db = await connectLean();
const admins = db.collection("admins");
const oid = (id) => new mongoose.Types.ObjectId(id);

try {
  if (flag("--rollback")) {
    const file = path.resolve(value("--rollback") ?? "");
    const ops = planRollback(JSON.parse(fs.readFileSync(file, "utf8")));
    for (const op of ops) {
      console.log(`${apply ? "Restoring" : "[dry run] Would restore"} ${op.email}: ${JSON.stringify(op.update)}`);
      if (apply) await admins.updateOne({ _id: oid(op.id), email: op.email }, op.update);
    }
    console.log(apply ? "\nRollback complete." : "\nNothing was changed. Add --apply to roll back.");
  } else {
    const all = await admins.find({}, { projection: { passwordHash: 0 } }).toArray();
    console.log(`\nAdmins found: ${all.length}`);
    for (const a of all) console.log(`  - ${a.email}  adminRole=${a.adminRole ?? "(not set, behaves as admin)"}  active=${a.isActive !== false}`);

    const plan = planPromotion(all, value("--email"));
    if (!plan.ok) { console.error(`\n${plan.error}`); process.exitCode = 1; }
    else if (plan.alreadySuper) console.log(`\n${plan.target.email} is already a Super Admin. Nothing to do.`);
    else {
      if (plan.otherSupers.length) console.log(`\nNote: other Super Admins already exist: ${plan.otherSupers.join(", ")}`);
      console.log(`\n${apply ? "Promoting" : "[dry run] Would promote"} ${plan.target.email} to super_admin. No other admin is touched.`);
      if (apply) {
        const backup = buildBackup(plan.target);
        const dir = path.join(here, "backups");
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `admin-promotion-${backup.createdAt.replace(/[:.]/g, "-")}.json`);
        fs.writeFileSync(file, JSON.stringify(backup, null, 2));
        const r = await admins.updateOne({ _id: plan.target._id, email: plan.target.email }, { $set: { adminRole: "super_admin" } });
        console.log(`Done (${r.modifiedCount} document changed). Backup saved: ${file}`);
        console.log(`To undo: npm run migrate-admins -- --rollback "${file}" --apply`);
      } else console.log("Nothing was changed. Add --apply to proceed.");
    }
  }
} finally {
  await disconnect();
}
