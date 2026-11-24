import { Link } from "react-router-dom";
import { LEARN } from "../../learn/data";

/** Homepage: all components as floating, hover-rotating image cards. */
export default function ComponentShowcase() {
  return (
    <section id="components" className="bg-brand-50">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-20">
        <h2 className="text-3xl font-bold sm:text-4xl">Meet the {LEARN.length} IoT components</h2>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">Tap any part to learn its basics, its pins and how it is used in embedded IoT. Log in as a student to start.</p>
        <ul className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-5 lg:grid-cols-6">
          {LEARN.map((c, i) => (
            <li key={c.slug} className="min-w-0"><Link to={`/student/components/${c.slug}`} className="tilt-card block rounded-lg bg-white p-2 shadow-card sm:p-3" aria-label={c.name}>
              <img src={c.img} alt={c.name} loading="lazy" className="float-y aspect-square w-full object-contain" style={{ ["--d" as string]: `${(i % 7) * -0.7}s` }} />
              <span className="mt-1 block truncate text-center text-[11px] font-semibold sm:text-xs">{c.name.split(" (")[0]}</span></Link></li>
          ))}
        </ul>
      </div>
    </section>
  );
}
