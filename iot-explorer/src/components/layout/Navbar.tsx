import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Logo from "../ui/Logo";
import ActionLink from "../ui/ActionLink";
import { ACTIONS } from "../../config/actions";
import { NAV_LINKS, SITE } from "../../config/site";
import { useAuth } from "../../lib/auth";
import ProfileMenu from "./ProfileMenu";
import { useLandingHref } from "../../lib/useLandingHref";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const landing = useLandingHref();
  const linkCls = "inline-flex min-h-11 min-w-11 items-center justify-center px-1 text-sm font-medium text-ink-soft hover:text-brand-600";

  // Close the mobile menu whenever the page changes.
  useEffect(() => setOpen(false), [pathname]);

  // Close the mobile menu with Escape, and when the screen grows to the desktop layout.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onChange);
    return () => { window.removeEventListener("keydown", onKey); mq.removeEventListener("change", onChange); };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-8">
        <a href={landing("#home")} className="flex min-h-11 min-w-0 items-center gap-2 sm:gap-3">
          <Logo className="h-12 w-auto shrink-0" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-lg font-semibold">{SITE.name}</span>
            <span className="hidden text-xs text-ink-faint lg:block">{SITE.college.name}</span>
          </span>
        </a>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <nav aria-label="Main" className="hidden items-center gap-4 md:flex lg:gap-6">
            {NAV_LINKS.map((l) => <a key={l.href} href={landing(l.href)} className={linkCls}>{l.label}</a>)}
            {!user && <ActionLink action={ACTIONS.login}>Login</ActionLink>}
          </nav>

          {/* Logged in: profile icon (My Profile / Dashboard / Logout). Visible on phones too. */}
          <ProfileMenu />

          {/* Hamburger: 44x44 touch target */}
          <button
            type="button"
            className="-mr-2 flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-md text-ink active:bg-brand-50 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(!open)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="menu-enter max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-white px-5 pb-5 pt-2 md:hidden">
          <ul className="flex flex-col">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={landing(l.href)} onClick={() => setOpen(false)} className="flex min-h-12 items-center border-b border-line font-medium active:bg-brand-50">{l.label}</a>
              </li>
            ))}
          </ul>
          {!user && (
            <div className="mt-4 flex flex-col gap-3">
              <ActionLink action={ACTIONS.login} size="lg" className="w-full" onClick={() => setOpen(false)}>Login</ActionLink>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
