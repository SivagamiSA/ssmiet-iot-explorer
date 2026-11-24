// Creates (or resets the password of) an admin account. Run:  npm run create-admin
import readline from "node:readline";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "../src/config/db.js";
import { Admin } from "../src/models/index.js";
import { hashPassword } from "../src/utils/password.js";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let muted = false;
const origWrite = rl._writeToOutput?.bind(rl);
if (origWrite) rl._writeToOutput = (s) => origWrite(muted ? (s.includes("\n") ? "\n" : "*") : s);
const ask = (q, hide = false) => new Promise((res) => { rl.question(q, (a) => { muted = false; res(a); }); muted = hide; });

// Optional:  npm run create-admin -- --super   makes this account the Super Admin (Admin Portal). Without it, a normal admin is created
// and an EXISTING admin keeps their current role.
const makeSuper = process.argv.includes("--super");

console.log(`\nCreate an IoT Explorer admin (teacher / coordinator)${makeSuper ? " as SUPER ADMIN" : ""}\n`);
const name = (await ask("Full name: ")).trim();
const email = (await ask("Email: ")).trim().toLowerCase();
const password = await ask("Password (min 8 chars, letters + numbers): ", true);
const confirm = await ask("Confirm password: ", true);
rl.close();

const schema = z.object({
  name: z.string().min(2, "Name is too short").max(80),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72)
    .regex(/[A-Za-z]/, "Password needs a letter").regex(/[0-9]/, "Password needs a number"),
});
const parsed = schema.safeParse({ name, email, password });
if (!parsed.success) { console.error("\n" + parsed.error.issues.map((i) => "- " + i.message).join("\n")); process.exit(1); }
if (password !== confirm) { console.error("\n- Passwords do not match"); process.exit(1); }

await connectDB();
const passwordHash = await hashPassword(password);
const existing = await Admin.findOne({ email });
if (existing) {
  existing.passwordHash = passwordHash; existing.name = name; existing.isActive = true;
  if (makeSuper) existing.adminRole = "super_admin";
  await existing.save();
  console.log(`\nAdmin ${email} already existed. Name and password were updated.`);
} else {
  await Admin.create({ name, email, passwordHash, ...(makeSuper ? { adminRole: "super_admin" } : {}) });
  console.log(`\nAdmin ${email} created. Log in at /login (Admin tab)`);
}
await mongoose.disconnect();
