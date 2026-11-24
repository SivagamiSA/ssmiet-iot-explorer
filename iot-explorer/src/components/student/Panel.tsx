import type { CSSProperties, ReactNode } from "react";

/** White card with a heading, used for every block on the dashboard. Fades up (delay in ms staggers a group of cards). */
export default function Panel({ title, children, className = "", delay = 0 }: { title: string; children: ReactNode; className?: string; delay?: number }) {
  return (
    <section className={`fade-up rounded-lg bg-white p-5 shadow-card sm:p-6 ${className}`} style={{ "--d": `${delay}ms` } as CSSProperties}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => (
  <p className="rounded-md bg-surface px-4 py-3 text-sm text-ink-soft">{children}</p>
);
