import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { homeFor, useAuth, type Role } from "../../lib/auth";

function Loading() {
  return <div className="grid min-h-[50vh] place-items-center text-ink-soft" role="status">Loading…</div>;
}

/** Only logged-in users with the right role. Others go to that role's login page (admins: /admin/login) (or their own home). */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to={role === "admin" ? "/admin/login" : "/login"} replace />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

/** Any logged-in user (student or admin), e.g. the My Profile page. Others go to the login page. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Login / register pages: already logged-in users are sent to their own home instead. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}
