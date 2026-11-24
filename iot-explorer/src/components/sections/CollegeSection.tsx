import { Section } from "../ui/Section";
import Logo from "../ui/Logo";
import { SITE } from "../../config/site";

export default function CollegeSection() {
  return (
    <Section id="college" tone="surface">
      <div className="grid items-center gap-6 rounded-lg border border-line bg-white p-6 shadow-card sm:gap-10 sm:p-12 md:grid-cols-[auto,1fr]">
        <Logo className="mx-auto h-24 w-auto sm:h-36 md:mx-0" />
        <div>
          <h2 className="text-2xl font-semibold sm:text-3xl">{SITE.college.name}</h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
            IoT Explorer is built for the students of {SITE.college.name}, to make hands-on learning of connected technology simple and accessible.
          </p>
        </div>
      </div>
    </Section>
  );
}
