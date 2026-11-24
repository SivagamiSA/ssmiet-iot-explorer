import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import Logo from "../ui/Logo";
import { ADMIN_NAV, type AdminNavItem } from "../../config/adminNav";
import { SITE } from "../../config/site";
import { useAuth } from "../../lib/auth";
import { adminRoleLabel, can, isSuperAdmin } from "../../lib/permissions";
import { showNotice } from "../../lib/notice";

/** The Admin Portal frame: sidebar on desktop, slide-over menu on phones. Completely separate from the student pages. */
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const items = ADMIN_NAV.filter((i) => (i.superOnly ? isSuperAdmin(user) : i.permission ? can(user, i.permission) : true));
  const doLogout = () => { logout(); navigate("/admin/login", { replace: true }); };

  const menu = (
    <ul className="space-y-1">
      {items.map((item) => <NavEntry key={item.href} item={item} active={pathname === item.href || pathname.startsWith(item.href + "/")} />)}
    </ul>
  );

  return (
    <div className="min-h-[100dvh] bg-surface lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-white lg:sticky lg:top-0 lg:flex lg:h-[100dvh]">
        <Brand />
        <nav aria-label="Admin portal" className="flex-1 overflow-y-auto p-3">{menu}</nav>
        <AccountBox onLogout={doLogout} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone / tablet top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-line bg-white px-3 lg:hidden">
          <button type="button" aria-label="Open menu" aria-expanded={open} aria-controls="admin-drawer" onClick={() => setOpen(true)}
            className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-md text-ink active:bg-brand-50">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <span className="truncate font-display font-semibold">Admin Portal</span>
          <button type="button" onClick={doLogout} className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-brand-600">Log out</button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-10"><Outlet /></main>
      </div>

      {/* Slide-over menu (phones) */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside id="admin-drawer" role="dialog" aria-modal="true" aria-label="Admin menu" className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-card">
            <Brand />
            <nav aria-label="Admin portal" className="flex-1 overflow-y-auto p-3">{menu}</nav>
            <AccountBox onLogout={doLogout} />
          </aside>
        </div>
      )}
    </div>
  );
}

function Brand() {
  return (
    <Link to="/admin/dashboard" className="flex min-h-16 items-center gap-3 border-b border-line px-4">
      <Logo className="h-10 w-auto shrink-0" />
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-display font-semibold">{SITE.name}</span>
        <span className="block text-xs font-semibold uppercase tracking-wide text-brand-700">Admin Portal</span>
      </span>
    </Link>
  );
}

function NavEntry({ item, active }: { item: AdminNavItem; active: boolean }) {
  const cls = `flex min-h-11 w-full touch-manipulation items-center rounded-md px-3 text-left text-sm font-semibold transition-colors ${active ? "bg-brand-500 text-white" : "text-ink-soft hover:bg-brand-50 hover:text-brand-600"}`;
  return (
    <li>
      {item.ready
        ? <Link to={item.href} className={cls} aria-current={active ? "page" : undefined}>{item.label}</Link>
        : <button type="button" className={cls} onClick={() => showNotice(item.notice ?? "Coming soon.")}>{item.label}</button>}
    </li>
  );
}

function AccountBox({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="border-t border-line p-4">
      <p className="truncate text-sm font-semibold">{user.name}</p>
      <p className="truncate text-xs text-ink-faint">{user.email}</p>
      <p className="mt-1 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{adminRoleLabel(user)}</p>
      <button type="button" onClick={onLogout} className="btn-outline mt-3 w-full">Log out</button>
    </div>
  );
}
