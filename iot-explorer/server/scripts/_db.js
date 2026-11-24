// Lean connection for maintenance scripts. Unlike src/config/db.js it does NOT sync indexes and turns autoIndex off,
// so a script that only reads (or makes one small, explicit change) cannot alter the database structure by accident.
import mongoose from "mongoose";
import dns from "node:dns";
import { env } from "../src/config/env.js";
import { explainConnectionError } from "../src/config/dbErrors.js";

export async function connectLean() {
  mongoose.set("strictQuery", true);
  mongoose.set("autoIndex", false);
  if (env.dnsServers.length) dns.setServers(env.dnsServers);
  try {
    await mongoose.connect(env.mongoUri, { dbName: env.dbName, serverSelectionTimeoutMS: 10000, autoIndex: false });
  } catch (err) {
    const { title, steps } = explainConnectionError(err, env.mongoUri);
    console.error(`\n[db] ${title}`);
    steps.forEach((x) => console.error(`     ${x}`));
    process.exit(1);
  }
  console.log(`[db] Connected, database "${mongoose.connection.name}"`);
  return mongoose.connection.db; // native driver handle: scripts use raw collections, never the app models
}
export const disconnect = () => mongoose.disconnect();
export { mongoose };
