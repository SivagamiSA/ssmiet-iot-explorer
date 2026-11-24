import { useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Empty } from "../components/student/Panel";
import { LCATS, LEARN } from "./data";
import { isDone, loadProg } from "./parts";

/** 3D IoT Component Explorer: image cards with search and categories, plus progress. */
export default function ComponentExplorer() {
  const [category, setCategory] = useState<(typeof LCATS)[number]>("All");
  const [q, setQ] = useState("");
  const prog = useMemo(loadProg, []);
  const done = LEARN.filter((c) => isDone(prog[c.slug])).length;
  const shown = useMemo(() => { const t = q.trim().toLowerCase(); return LEARN.filter((c) => (category === "All" || c.cat === category) && (!t || `${c.name} ${c.summary} ${c.cat}`.toLowerCase().includes(t))); }, [category, q]);

  return (
    <section className="space-y-5">
      <div className="fade-up rounded-lg border border-brand-100 bg-brand-50 p-5 sm:p-8">
        <h2 className="text-2xl font-bold sm:text-3xl">IoT Component Explorer</h2>
        <p className="mt-1 text-ink-soft">Pick a component to learn its basics, its pins and how it works in embedded IoT.</p>
        <div className="mt-4 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={done} aria-valuemax={LEARN.length} aria-label="Components completed"><div className="h-full bg-brand-500" style={{ width: `${(done / LEARN.length) * 100}%` }} /></div><span className="text-sm font-semibold">{done} / {LEARN.length} completed</span></div>
        <div className="mt-5 max-w-md"><label htmlFor="comp-search" className="field-label">Search components</label>
          <input id="comp-search" type="search" className="input" placeholder="e.g. ultrasonic, relay, wifi" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div role="group" aria-label="Filter by category" className="scroll-x mt-4 flex gap-2 pb-1">
          {LCATS.map((c) => <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${category === c ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-ink-soft hover:border-brand-500 hover:text-brand-600"}`}>{c}</button>)}
        </div>
      </div>
      <p className="text-sm text-ink-soft" role="status">{shown.length} {shown.length === 1 ? "component" : "components"}</p>
      {shown.length === 0 ? <Empty>No components match your search.</Empty> : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {shown.map((c, i) => (
            <li key={c.slug} className="fade-up min-w-0" style={{ "--d": `${Math.min(i, 10) * 40}ms` } as CSSProperties}>
              <Link to={`/student/components/${c.slug}`} className="tilt-card block h-full rounded-lg bg-white p-3 shadow-card sm:p-4">
                <div className="flex aspect-square items-center justify-center rounded-md bg-gradient-to-br from-brand-50 to-white"><img src={c.img} alt={c.name} loading="lazy" className="h-4/5 w-4/5 object-contain" /></div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-700">{c.cat}{isDone(prog[c.slug]) && " · ✓"}</p>
                <h3 className="mt-0.5 text-sm font-semibold leading-tight sm:text-base">{c.name}</h3>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
