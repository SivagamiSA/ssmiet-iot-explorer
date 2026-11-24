import { Section, SectionHeading } from "../ui/Section";
import SafeImage from "../ui/SafeImage";
import { PROJECTS } from "../../data/content";

export default function Projects() {
  return (
    <Section id="projects" tone="surface">
      <SectionHeading title="Explore projects" text="A few of the things you will build. Each one starts simple and grows with your skills." />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PROJECTS.map((p) => (
          <article key={p.title} className="overflow-hidden rounded-lg bg-white shadow-card">
            <SafeImage src={p.image} alt={p.title} className="aspect-[4/3] w-full" />
            <div className="p-5">
              <h3 className="text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.text}</p>
              {p.tag && <p className="mt-4 border-t border-line pt-3 text-xs font-medium text-brand-700">{p.tag}</p>}
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
