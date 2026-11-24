import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, tokenStore } from "./api";

export type Role = "student" | "admin";
export interface User {
  id: string; role: Role; name: string; email: string;
  schoolName?: string; standard?: number;
  // Admin Portal (admins only). `permissions` is the full effective list worked out by the server.
  adminRole?: "super_admin" | "admin"; permissions?: string[]; lastLoginAt?: string | null;
}

interface AuthState {
  user: User | null;
  loading: boolean; // true while a saved login is being checked
  login: (role: Role, credentials: Record<string, string>) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);
/** Where a user lands after logging in: students start in Learning, admins in their dashboard. */
export const homeFor = (role: Role) => (role === "admin" ? "/admin/dashboard" : "/student/learning");
/** The dashboard page for a role (used by the profile menu). */
export const dashboardFor = (role: Role) => (role === "admin" ? "/admin/dashboard" : "/student/dashboard");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !!tokenStore.get());

  // Restore a saved login when the site is opened.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api<{ user: User }>("/auth/me")
      .then((r) => setUser(r.user))
      .catch((e) => { if (!(e instanceof ApiError) || e.status === 401 || e.status === 403) tokenStore.clear(); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (role: Role, credentials: Record<string, string>) => {
    const r = await api<{ token: string; user: User }>(`/auth/${role}/login`, { body: credentials });
    tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
