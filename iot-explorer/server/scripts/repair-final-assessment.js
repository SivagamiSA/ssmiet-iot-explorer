// Safe, repeatable repair of the final assessment + certificate data. Nothing is deleted.
//   npm run db:repair-assessment                       preview only (changes nothing)
//   npm run db:repair-assessment -- --apply            apply the repair and create the indexes
//   npm run db:repair-assessment -- --apply --drop-index=<name>   also drop ONE named unexpected unique index on certificates
import { connectLean, disconnect } from "./_db.js";
import { runAssessmentRepair, describeRepair } from "../src/db/maintenance.js";
import Certificate from "../src/models/Certificate.js";
import FinalAttempt from "../src/models/FinalAttempt.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const dropIndexNames = args.filter((a) => a.startsWith("--drop-index=")).map((a) => a.slice("--drop-index=".length));

const db = await connectLean();
try {
  const report = await runAssessmentRepair(db, { Certificate, FinalAttempt }, { dryRun: !apply, dropIndexNames });
  console.log(JSON.stringify(report, null, 2));
  describeRepair(report);
  const live = await db.collection("certificates").indexes();
  console.log("\ncertificates indexes now:", live.map((i) => i.name).join(", "));
  console.log(apply ? "\nRepair applied. Nothing was deleted." : "\nPREVIEW ONLY: nothing was changed. Add --apply to repair.");
} finally {
  await disconnect();
}
