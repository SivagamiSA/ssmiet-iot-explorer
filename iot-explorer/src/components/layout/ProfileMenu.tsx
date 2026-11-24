import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { dashboardFor, useAuth } from "../../lib/auth";

const itemCls = "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-ink hover:bg-brand-50 hover:text-brand-600 focus-visible:bg-brand-50";

/** Profile icon in the header. Desktop mouse: opens on hover (and stays open if clicked). Touch / keyboard: tap or Enter to toggle. */
export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const byHover = useRef(false);
  const timer = useRef<number>();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: Event) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!user) return null;

  const hoverIn = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    window.clearTimeout(timer.current);
    if (!open) byHover.current = true;
    setOpen(true);
  };
  const hoverOut = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || !byHover.current) return;
    timer.current = window.setTimeout(() => { setOpen(false); byHover.current = false; }, 180);
  };
  const onClick = () => {
    if (open && byHover.current) { byHover.current = false; return; } // opened by hover: a click keeps it open
    byHover.current = false;
    setOpen(!open);
  };
  const doLogout = () => { setOpen(false); logout(); navigate("/", { replace: true }); };

  return (
    <div ref={wrap} className="relative" onPointerEnter={hoverIn} onPointerLeave={hoverOut}>
      <button
        ref={button} type="button" onClick={onClick}
        aria-label="Account menu" aria-haspopup="menu" aria-expanded={open} aria-controls="profile-menu"
        className={`flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border text-brand-600 transition-colors ${open ? "border-brand-500 bg-brand-50" : "border-line bg-white hover:border-brand-500 hover:bg-brand-50"}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>
      </button>

      {/* Phones: full-width card under the header. sm and up: small card under the icon. */}
      <div
        id="profile-menu" role="menu" aria-label="Account"
        className={`fixed inset-x-4 top-[4.25rem] z-50 origin-top-right rounded-lg border border-line bg-white p-2 shadow-card transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64 ${open ? "visible translate-y-0 scale-100 opacity-100" : "invisible pointer-events-none -translate-y-2 scale-95 opacity-0"}`}
      >
        <div className="border-b border-line px-3 pb-2 pt-1">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-xs text-ink-faint">{user.email}</p>
        </div>
        <div className="pt-2">
          <Link role="menuitem" to="/profile" className={itemCls}><Icon d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />My Profile</Link>
          <Link role="menuitem" to={dashboardFor(user.role)} className={itemCls}><Icon d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" />Dashboard</Link>
          <button role="menuitem" type="button" onClick={doLogout} className={itemCls}><Icon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />Logout</button>
        </div>
      </div>
    </div>
  );
}

const Icon = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-ink-faint"><path d={d} /></svg>
);
