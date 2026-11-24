// Single source of truth for admin roles and permissions (Admin Portal, Phase 1).
//
// Two admin roles share the same login and the same JWT (`role: "admin"`, unchanged):
//   super_admin  -> every permission, plus admin-account and security management (Super Admin only)
//   admin        -> only the permissions saved on their account (`permissions[]`)
// "manage" always includes "view", so only one of the two needs to be stored.
export const ADMIN_ROLES = ["super_admin", "admin"];

export const MODULE_ACTIONS = {
  students: ["view", "manage"],
  schools: ["view", "manage"],
  components: ["view", "manage"],
  projects: ["view", "manage"],
  simulations: ["view", "manage"],
  events: ["view", "manage"],
  quizzes: ["view", "manage"],
  reports: ["view", "manage"], // manage = export
  automation: ["view", "manage", "approve"],
  audit: ["view"],
};

export const PERMISSIONS = Object.entries(MODULE_ACTIONS).flatMap(([m, actions]) => actions.map((a) => `${m}.${a}`));

export const isSuperAdmin = (admin) => admin?.adminRole === "super_admin";

/** The full list of permissions an admin really has (super admin = all; "manage" adds "view"). */
export function effectivePermissions(admin) {
  if (!admin) return [];
  if (isSuperAdmin(admin)) return [...PERMISSIONS];
  const own = new Set((admin.permissions ?? []).filter((p) => PERMISSIONS.includes(p)));
  for (const p of [...own]) if (p.endsWith(".manage")) own.add(p.replace(/\.manage$/, ".view"));
  return PERMISSIONS.filter((p) => own.has(p));
}

export const hasPermission = (admin, permission) => effectivePermissions(admin).includes(permission);
