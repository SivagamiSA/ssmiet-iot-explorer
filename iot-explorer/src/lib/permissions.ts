import type { User } from "./auth";

/** Admin Portal permissions. The server sends the FULL effective list in `user.permissions`, so no rules are duplicated here. */
export const can = (user: User | null | undefined, permission: string) =>
  user?.role === "admin" && !!user.permissions?.includes(permission);

export const isSuperAdmin = (user: User | null | undefined) => user?.role === "admin" && user.adminRole === "super_admin";

export const adminRoleLabel = (user: User | null | undefined) => (isSuperAdmin(user) ? "Super Admin" : "Admin");
