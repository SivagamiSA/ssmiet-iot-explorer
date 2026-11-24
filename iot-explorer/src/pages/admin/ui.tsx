import { useEffect, useState, type ReactNode } from "react";

export interface Paged<T> { page: number; pages: number; total: number; limit: number; items: T[] }

export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "-");

export function StatusBadge({ active }: { active: boolean }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>{active ? "Active" : "Inactive"}</span>;
}

export function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-soft">
      <span>{total} record{total === 1 ? "" : "s"} · page {page} of {pages}</span>
      <div className="flex gap-2">
        <button type="button" className="btn-outline !min-h-10 !px-4" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <button type="button" className="btn-outline !min-h-10 !px-4" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-4 shadow-card sm:p-6">
      {(title || action) && <div className="mb-4 flex flex-wrap items-center justify-between gap-2">{title && <h2 className="text-lg font-semibold">{title}</h2>}{action}</div>}
      {children}
    </section>
  );
}

export const Notice = ({ tone = "info", children }: { tone?: "info" | "error" | "ok"; children: ReactNode }) => (
  <p role={tone === "error" ? "alert" : "status"} className={`rounded-md px-4 py-3 text-sm ${tone === "error" ? "bg-red-50 text-red-800" : tone === "ok" ? "bg-green-50 text-green-800" : "bg-surface text-ink-soft"}`}>{children}</p>
);

/** Waits `ms` after the last change before returning the value (so search does not call the API on every key). */
export function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
