// Pure helpers for migrate-admins.js (no database access, so they can be unit-tested).

/** Decide what promoting `email` to super_admin would do. `admins` = raw documents from the admins collection. */
export function planPromotion(admins, email) {
  const wanted = String(email ?? "").trim().toLowerCase();
  if (!wanted) return { ok: false, error: "Pass the designated primary admin with --email you@example.com" };
  const target = admins.find((a) => String(a.email).toLowerCase() === wanted);
  if (!target) return { ok: false, error: `No admin with email "${wanted}" exists. Nothing will be changed.` };
  if (target.isActive === false) return { ok: false, error: `Admin "${wanted}" is disabled. Enable it first; nothing will be changed.` };
  const otherSupers = admins.filter((a) => a.adminRole === "super_admin" && String(a._id) !== String(target._id)).map((a) => a.email);
  const alreadySuper = target.adminRole === "super_admin";
  return { ok: true, target, alreadySuper, otherSupers, willChange: !alreadySuper };
}

/** What to store so the change can be undone exactly (including "the field did not exist before"). */
export function buildBackup(target, now = new Date()) {
  return {
    kind: "admin-super-promotion",
    createdAt: now.toISOString(),
    entries: [{
      id: String(target._id), email: target.email,
      hadAdminRole: Object.prototype.hasOwnProperty.call(target, "adminRole"), adminRole: target.adminRole ?? null,
    }],
  };
}

/** Turn a backup file into update operations that restore the previous state. */
export function planRollback(backup) {
  if (backup?.kind !== "admin-super-promotion" || !Array.isArray(backup.entries)) throw new Error("This is not an admin migration backup file.");
  return backup.entries.map((e) => (e.hadAdminRole
    ? { id: e.id, email: e.email, update: { $set: { adminRole: e.adminRole } } }
    : { id: e.id, email: e.email, update: { $unset: { adminRole: "" } } }));
}
