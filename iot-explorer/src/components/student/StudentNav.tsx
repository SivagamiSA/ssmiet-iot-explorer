import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { STUDENT_NAV } from "../../config/studentNav";
import { showNotice } from "../../lib/notice";

/** Portal menu: one scrollable row of 44px buttons on phones, a normal row on desktop. */
export default function StudentNav() {
  const { pathname } = useLocation();
  const list = useRef<HTMLUListElement>(null);
  // On phones the menu scrolls sideways: bring the current page's button into view.
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && list.current) list.current.scrollLeft = Math.max(0, el.offsetLeft - 16);
  }, [pathname]);
  const base = "inline-flex min-h-11 shrink-0 touch-manipulation items-center rounded-md px-4 text-sm font-semibold transition-colors duration-200";
  return (
    <nav aria-label="Student portal" className="border-b border-line bg-white">
      <div className="mx-auto max-w-6xl px-3 sm:px-8">
        <ul ref={list} className="scroll-x relative flex gap-1 py-2">
          {STUDENT_NAV.map((item) => {
            const active = [item.href, ...item.also].some((h) => pathname === h || pathname.startsWith(h + "/"));
            const cls = `${base} ${active ? "bg-brand-500 text-white" : "text-ink-soft hover:bg-brand-50 hover:text-brand-600"}`;
            return (
              <li key={item.href} className="shrink-0">
                {item.ready
                  ? <Link to={item.href} className={cls} aria-current={active ? "page" : undefined}>{item.label}</Link>
                  : <button type="button" className={cls} onClick={() => showNotice("notice" in item ? item.notice : "Coming soon.")}>{item.label}</button>}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
