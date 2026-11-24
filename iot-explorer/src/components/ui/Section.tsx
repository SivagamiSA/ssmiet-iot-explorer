import type { ReactNode } from "react";

interface SectionProps { id: string; tone?: "white" | "surface" | "dark"; children: ReactNode }

export function Section({ id, tone = "white", children }: SectionProps) {
  const bg = { white: "bg-white", surface: "bg-surface", dark: "bg-ink text-white" }[tone];
  return (
    <section id={id} className={`${bg} py-16 sm:py-20 lg:py-24`}>
      <div className="mx-auto max-w-6xl px-5 sm:px-8">{children}</div>
    </section>
  );
}

export function SectionHeading({ title, text, dark = false }: { title: string; text?: string; dark?: boolean }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-3xl font-semibold sm:text-4xl">{title}</h2>
      {text && <p className={`mt-4 text-lg leading-relaxed ${dark ? "text-white/70" : "text-ink-soft"}`}>{text}</p>}
    </div>
  );
}
