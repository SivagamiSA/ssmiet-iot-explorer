import { Section, SectionHeading } from "../ui/Section";
import { STEPS } from "../../data/content";

export default function HowItWorks() {
  return (
    <Section id="how-it-works">
      <SectionHeading title="How it works" text="Every project follows the same four steps." />
      <ol className="relative mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
        {/* Circuit-trace line connecting the steps */}
        <span aria-hidden className="absolute bottom-6 left-5 top-6 w-0.5 bg-brand-100 md:inset-x-6 md:bottom-auto md:top-5 md:h-0.5 md:w-auto" />
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative flex gap-5 md:block">
            <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-brand-500 bg-white font-display font-semibold text-brand-600">
              {i + 1}
            </span>
            <div className="md:mt-5">
              <h3 className="text-xl font-semibold">{s.title}</h3>
              <p className="mt-1 text-ink-soft">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
