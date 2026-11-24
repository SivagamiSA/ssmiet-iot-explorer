import { Section, SectionHeading } from "../ui/Section";
import { INTERACTIVE } from "../../data/content";

export default function InteractiveLearning() {
  return (
    <Section id="interactive" tone="dark">
      <SectionHeading dark title="Interactive learning" text="Learning IoT is easier when you can see the wiring, read the code and watch it run." />
      <div className="mt-12 grid gap-px overflow-hidden rounded-lg bg-white/15 md:grid-cols-3">
        {INTERACTIVE.map((i) => (
          <div key={i.title} className="bg-ink p-6 sm:p-7">
            <h3 className="text-xl font-semibold text-brand-500">{i.title}</h3>
            <p className="mt-3 leading-relaxed text-white/75">{i.text}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
