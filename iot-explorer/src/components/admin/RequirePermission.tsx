import type { ReactNode } from "react";
import { useAuth } from "../../lib/auth";
import { can, isSuperAdmin } from "../../lib/permissions";

/** Page-level guard for the Admin Portal. The server enforces the same rule; this just avoids showing a broken page. */
export function RequirePermission({ permission, superOnly, children }: { permission?: string; superOnly?: boolean; children: ReactNode }) {
  const { user } = useAuth();
  const ok = superOnly ? isSuperAdmin(user) : permission ? can(user, permission) : true;
  if (ok) return <>{children}</>;
  return <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">You do not have permission to open this page.</p>;
}
