import test from "node:test";
import assert from "node:assert/strict";
import { PERMISSIONS, effectivePermissions, hasPermission, isSuperAdmin } from "../src/utils/permissions.js";
import { planPromotion, buildBackup, planRollback } from "../scripts/_adminMigration.js";

test("super admin has every permission", () => {
  const a = { adminRole: "super_admin", permissions: [] };
  assert.equal(isSuperAdmin(a), true);
  assert.deepEqual(effectivePermissions(a), PERMISSIONS);
});

test("plain admin gets only granted permissions; manage includes view; unknown values ignored", () => {
  const a = { adminRole: "admin", permissions: ["students.manage", "events.view", "bogus.perm"] };
  assert.deepEqual(effectivePermissions(a), ["students.view", "students.manage", "events.view"]);
  assert.equal(hasPermission(a, "students.view"), true);
  assert.equal(hasPermission(a, "events.manage"), false);
  assert.equal(hasPermission(a, "audit.view"), false);
});

test("an old admin document with no new fields has no permissions and is not super", () => {
  const legacy = { name: "Old", email: "old@x.com" };
  assert.deepEqual(effectivePermissions(legacy), []);
  assert.equal(isSuperAdmin(legacy), false);
  assert.deepEqual(effectivePermissions(null), []);
});

const admins = [
  { _id: "1", email: "boss@x.com", isActive: true },
  { _id: "2", email: "teacher@x.com", isActive: true, adminRole: "admin" },
  { _id: "3", email: "off@x.com", isActive: false },
];

test("promotion plan: only the designated admin, case-insensitive, with safety refusals", () => {
  const p = planPromotion(admins, " BOSS@x.com ");
  assert.equal(p.ok, true); assert.equal(p.target._id, "1"); assert.equal(p.willChange, true);
  assert.equal(planPromotion(admins, "").ok, false);               // no email given -> refuse (never promote everyone)
  assert.equal(planPromotion(admins, "nobody@x.com").ok, false);   // unknown
  assert.equal(planPromotion(admins, "off@x.com").ok, false);      // disabled
  assert.equal(planPromotion([{ _id: "9", email: "s@x.com", adminRole: "super_admin", isActive: true }], "s@x.com").alreadySuper, true);
  assert.deepEqual(planPromotion([...admins, { _id: "8", email: "other@x.com", adminRole: "super_admin", isActive: true }], "boss@x.com").otherSupers, ["other@x.com"]);
});

test("backup + rollback restore the exact previous state (field absent -> unset, field present -> set back)", () => {
  const absent = buildBackup({ _id: "1", email: "boss@x.com" });
  assert.equal(absent.entries[0].hadAdminRole, false);
  assert.deepEqual(planRollback(absent)[0].update, { $unset: { adminRole: "" } });
  const present = buildBackup({ _id: "2", email: "t@x.com", adminRole: "admin" });
  assert.deepEqual(planRollback(present)[0].update, { $set: { adminRole: "admin" } });
  assert.throws(() => planRollback({ kind: "other" }));
});
