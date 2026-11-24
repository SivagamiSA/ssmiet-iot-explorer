import { Section, SectionHeading } from "../ui/Section";
import { ABOUT_POINTS } from "../../data/content";

export default function About() {
  return (
    <Section id="about" tone="surface">
      <div className="grid gap-12 lg:grid-cols-2">
        <SectionHeading
          title="Understand IoT by doing, not just reading."
          text="IoT Explorer connects theory with real hardware. Students learn how devices sense, decide and communicate by working through practical projects from the very first lesson."
        />
        <ul className="space-y-6">
          {ABOUT_POINTS.map((p) => (
            <li key={p.title} className="border-l-2 border-brand-500 pl-5">
              <h3 className="text-lg font-semibold">{p.title}</h3>
              <p className="mt-1 text-ink-soft">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
