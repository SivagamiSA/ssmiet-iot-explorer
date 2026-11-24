// API tests WITHOUT a database: the Mongoose model methods the routes call are replaced with in-memory stubs.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";
process.env.MONGODB_URI = "mongodb://127.0.0.1:1/never-used";

const { createApp } = await import("../src/app.js");
const { Admin, Student, Project, Event, AuditLog } = await import("../src/models/index.js");
const { hashPassword } = await import("../src/utils/password.js");
const { signToken } = await import("../src/utils/token.js");

const hash = await hashPassword("Passw0rd!");
const mk = (o) => ({ _id: `id-${o.email}`, name: o.email.split("@")[0], role: "admin", isActive: true, passwordHash: hash, permissions: [], ...o });
const ADMINS = {
  boss: mk({ email: "boss@x.com", adminRole: "super_admin" }),
  viewer: mk({ email: "viewer@x.com", adminRole: "admin", permissions: ["students.view", "audit.view"] }),
  empty: mk({ email: "empty@x.com", adminRole: "admin" }),
  off: mk({ email: "off@x.com", adminRole: "admin", isActive: false }),
};
const STUDENT = { _id: "st-1", name: "Stu", role: "student", isActive: true, email: "stu@x.com" };

const audit = []; const updates = [];
const stubs = {
  adminFindOne: Admin.findOne, adminFindById: Admin.findById, adminUpdateOne: Admin.updateOne, adminCount: Admin.countDocuments,
  stuFindById: Student.findById, stuCount: Student.countDocuments, prjCount: Project.countDocuments, evtCount: Event.countDocuments,
  logCreate: AuditLog.create, logFind: AuditLog.find, logCount: AuditLog.countDocuments,
};
Admin.findOne = ({ email }) => ({ select: async () => Object.values(ADMINS).find((a) => a.email === email) ?? null });
Admin.findById = async (id) => Object.values(ADMINS).find((a) => a._id === id) ?? null;
Admin.updateOne = async (...a) => { updates.push(a); return {}; };
Admin.countDocuments = async (f = {}) => (f.adminRole === "super_admin" ? 1 : f.isActive ? 3 : 4);
Student.findById = async (id) => (id === STUDENT._id ? STUDENT : null);
Student.countDocuments = async (f = {}) => (f.isActive ? 8 : 10);
Project.countDocuments = async (f = {}) => (f.status === "approved" ? 5 : f.status === "pending" ? 2 : 7);
Event.countDocuments = async (f = {}) => (f.status === "published" ? 1 : f.status === "draft" ? 1 : 2);
AuditLog.create = async (d) => { audit.push(d); return d; };
AuditLog.find = () => ({ sort: () => ({ limit: () => ({ lean: async () => [{ _id: "a1", action: "admin.login", actorEmail: "boss@x.com", summary: "Admin logged in.", createdAt: new Date() }] }), skip: () => ({ limit: () => ({ lean: async () => [] }) }) }) });
AuditLog.countDocuments = async () => 1;

let server, base;
before(() => new Promise((res) => { server = createApp().listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${server.address().port}`; res(); }); }));
after(() => { Object.assign(Admin, { findOne: stubs.adminFindOne, findById: stubs.adminFindById, updateOne: stubs.adminUpdateOne, countDocuments: stubs.adminCount }); server.close(); });

const call = (path, { token, body } = {}) => fetch(base + path, {
  method: body ? "POST" : "GET",
  headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: body ? JSON.stringify(body) : undefined,
}).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));
const tokenFor = (a) => signToken(a);

test("admin login returns role + permissions, records last login and an audit entry", async () => {
  audit.length = 0; updates.length = 0;
  const r = await call("/api/auth/admin/login", { body: { email: "boss@x.com", password: "Passw0rd!" } });
  assert.equal(r.status, 200);
  assert.ok(r.json.token);
  assert.equal(r.json.user.adminRole, "super_admin");
  assert.ok(r.json.user.permissions.includes("students.manage"));
  assert.equal(r.json.user.passwordHash, undefined);
  assert.equal(updates.length, 1); assert.ok(updates[0][1].$set.lastLoginAt);
  assert.equal(audit.at(-1).action, "admin.login");
});

test("failed / disabled admin logins are refused and audited (no password in the log)", async () => {
  audit.length = 0;
  assert.equal((await call("/api/auth/admin/login", { body: { email: "boss@x.com", password: "wrong-pass1" } })).status, 401);
  assert.equal((await call("/api/auth/admin/login", { body: { email: "nobody@x.com", password: "wrong-pass1" } })).status, 401);
  assert.equal((await call("/api/auth/admin/login", { body: { email: "off@x.com", password: "Passw0rd!" } })).status, 403);
  assert.deepEqual(audit.map((a) => a.action), ["admin.login_failed", "admin.login_failed", "admin.login_blocked"]);
  assert.ok(!JSON.stringify(audit).includes("wrong-pass1") && !JSON.stringify(audit).includes("Passw0rd!"));
});

test("existing endpoints still work: /api/auth/me and /api/admin/ping", async () => {
  const me = await call("/api/auth/me", { token: tokenFor(ADMINS.viewer) });
  assert.equal(me.status, 200); assert.equal(me.json.user.adminRole, "admin"); assert.deepEqual(me.json.user.permissions, ["students.view", "audit.view"]);
  assert.equal((await call("/api/admin/ping", { token: tokenFor(ADMINS.empty) })).status, 200);
  assert.equal((await call("/api/health")).status, 200);
});

test("admin APIs reject anonymous users, students and disabled admins", async () => {
  assert.equal((await call("/api/admin/dashboard")).status, 401);
  assert.equal((await call("/api/admin/dashboard", { token: tokenFor(STUDENT) })).status, 403);
  assert.equal((await call("/api/admin/audit-log", { token: tokenFor(STUDENT) })).status, 403);
  assert.equal((await call("/api/admin/dashboard", { token: tokenFor(ADMINS.off) })).status, 401);
});

test("dashboard shows only what each admin may view", async () => {
  const boss = (await call("/api/admin/dashboard", { token: tokenFor(ADMINS.boss) })).json;
  assert.deepEqual(Object.keys(boss).sort(), ["admin", "admins", "events", "generatedAt", "projects", "recentActivity", "students"]);
  assert.deepEqual(boss.projects, { total: 7, approved: 5, pending: 2 });
  assert.deepEqual(boss.admins, { total: 4, active: 3, superAdmins: 1 });

  const viewer = (await call("/api/admin/dashboard", { token: tokenFor(ADMINS.viewer) })).json;
  assert.deepEqual(Object.keys(viewer).sort(), ["admin", "generatedAt", "recentActivity", "students"]); // no projects/events/admins
  assert.deepEqual(viewer.students, { total: 10, active: 8 });

  const empty = (await call("/api/admin/dashboard", { token: tokenFor(ADMINS.empty) })).json;
  assert.deepEqual(Object.keys(empty).sort(), ["admin", "generatedAt"]);
});

test("audit log needs audit.view", async () => {
  assert.equal((await call("/api/admin/audit-log", { token: tokenFor(ADMINS.empty) })).status, 403);
  const ok = await call("/api/admin/audit-log?limit=5", { token: tokenFor(ADMINS.viewer) });
  assert.equal(ok.status, 200); assert.equal(ok.json.total, 1);
  assert.equal((await call("/api/admin/audit-log?limit=9999", { token: tokenFor(ADMINS.boss) })).status, 400);
});
