import type { ReactNode } from "react";

/** Page wrapper shared by login / register pages: grey background, centred card, title. */
export default function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="bg-surface px-4 py-10 sm:px-8 sm:py-16">
      <div className="auth-card">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{subtitle}</p>}
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-soft">{footer}</div>}
      </div>
    </section>
  );
}
