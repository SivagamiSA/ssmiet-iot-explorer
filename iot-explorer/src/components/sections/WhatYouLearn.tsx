import { Section, SectionHeading } from "../ui/Section";
import SafeImage from "../ui/SafeImage";
import { LEARN_ITEMS } from "../../data/content";

export default function WhatYouLearn() {
  return (
    <Section id="learning">
      <SectionHeading title="What you will learn" text="The core hardware behind almost every IoT system." />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {LEARN_ITEMS.map((item) => (
          <article key={item.title} className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
            <SafeImage src={item.image} alt={item.title} className="aspect-[3/2] w-full" />
            <div className="p-5">
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.text}</p>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
