import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateMongoUri } from "./dbErrors.js";

// Local development: load the .env that sits in the project root. On Render there is no .env file; the variables come from the dashboard.
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../../.env") });

function fail(message) {
  console.error(`\n[config] ${message}\n`);
  process.exit(1);
}
function required(name) {
  const value = (process.env[name] ?? "").trim();
  if (!value) fail(`Missing ${name}. Copy .env.example to .env and fill it in (on Render: Environment tab).`);
  return value;
}

const jwtSecret = required("JWT_SECRET");
if (jwtSecret.length < 32) fail("JWT_SECRET must be at least 32 characters. See .env.example for how to generate one.");
const mongoUri = required("MONGODB_URI");
const uriProblem = validateMongoUri(mongoUri);
if (uriProblem && process.env.NODE_ENV !== "test") fail(uriProblem);

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongoUri,
  dbName: "iot_explorer", // ONE database for the whole application, every stage
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  trustProxy: process.env.TRUST_PROXY === "true",
  // One or more allowed browser origins, comma separated (only needed when the website is served from a different origin than the API).
  clientOrigins: (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean),
  dnsServers: (process.env.MONGODB_DNS_SERVERS || "").split(",").map((s) => s.trim()).filter(Boolean),
  autoRepair: process.env.DB_AUTO_REPAIR !== "false",
};
