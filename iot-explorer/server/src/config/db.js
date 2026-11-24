import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";
import { explainConnectionError } from "./dbErrors.js";
import { runAssessmentRepair, describeRepair } from "../db/maintenance.js";

/** Optional (MONGODB_DNS_SERVERS): makes only this process use the given DNS servers for the Atlas SRV lookup. */
export function applyDnsServers(servers = env.dnsServers, setServers = (s) => dns.setServers(s)) {
  if (!servers.length) return false;
  setServers(servers);
  return true;
}

export async function connectDB() {
  mongoose.set("strictQuery", true);
  applyDnsServers();
  try {
    // dbName forces the single `iot_explorer` database even if the URI names another one.
    await mongoose.connect(env.mongoUri, { dbName: env.dbName, serverSelectionTimeoutMS: 10000 });
  } catch (err) {
    const { title, steps } = explainConnectionError(err, env.mongoUri);
    console.error(`\n[db] ${title}`);
    steps.forEach((s) => console.error(`     ${s}`));
    console.error(`     (technical detail: ${String(err.message).replace(/\/\/[^@/\s]*@/g, "//***@")})\n`);
    process.exit(1);
  }
  console.log(`[db] Connected to MongoDB Atlas, database "${mongoose.connection.name}"`);

  try {
    const { default: Student } = await import("../models/Student.js");
    const { default: Certificate } = await import("../models/Certificate.js");
    const { default: FinalAttempt } = await import("../models/FinalAttempt.js");
    await Student.syncIndexes(); // existing behaviour (removes the old unique registerNumber index)
    // Certificate / FinalAttempt have autoIndex off: repair legacy rows + the removed certificateId index FIRST, then build the unique indexes.
    // Nothing is deleted; every step is repeatable. Disable with DB_AUTO_REPAIR=false and run `npm run db:repair-assessment` by hand instead.
    if (env.autoRepair) describeRepair(await runAssessmentRepair(mongoose.connection.db, { Certificate, FinalAttempt }));
    else console.log("[db] DB_AUTO_REPAIR=false: skipped the assessment repair.");
  } catch (err) {
    // A problem while repairing must not stop the website; the backend still enforces the pass lock in code.
    console.error(`[db] Index/repair step failed: ${err.message}. Run "npm run db:repair-assessment" for details.`);
  }
}
