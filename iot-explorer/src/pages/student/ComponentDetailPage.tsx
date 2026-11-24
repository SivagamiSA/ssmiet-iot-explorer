import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import StudentNav from "../../components/student/StudentNav";
import Panel from "../../components/student/Panel";
import { LEARN, bySlug } from "../../learn/data";
import { Scene, STAGES, isDone, loadProg, saveProg, type Prog } from "../../learn/parts";

/** Guided lesson for one component: overview → 3D view → pins → working → wiring → uses → quiz. */
export default function ComponentDetailPage() {
  const { slug = "" } = useParams();
  const c = bySlug(slug);
  const [stage, setStage] = useState(-1); // -1 = start screen
  const [step, setStep] = useState(0); const [play, setPlay] = useState(true); const [run, setRun] = useState(0);
  const [prog, setProg] = useState<Prog>({ stages: [] });
  useEffect(() => { setStage(-1); setStep(0); setPlay(true); setRun((r) => r + 1); setProg(loadProg()[slug] ?? { stages: [] }); }, [slug]);
  useEffect(() => { if (stage !== 2 || !play || !c) return; const t = setInterval(() => setStep((s) => (s + 1) % c.steps.length), 3200); return () => clearInterval(t); }, [stage, play, c]);
  if (!c) return <Navigate to="/student/components" replace />;

  const update = (fn: (p: Prog) => Prog) => setProg((old) => { const n = fn(old); const all = loadProg(); all[slug] = n; saveProg(all); return n; });
  const go = (s: number) => { setStage(s); setStep(0); setRun((r) => r + 1); if (s >= 0) update((p) => (p.stages.includes(s) ? p : { ...p, stages: [...p.stages, s] })); };
  const i = LEARN.findIndex((x) => x.slug === slug); const prev = LEARN[(i + LEARN.length - 1) % LEARN.length], next = LEARN[(i + 1) % LEARN.length];
  const pct = Math.round((prog.stages.length / STAGES.length) * 100);

  return (
    <>
      <StudentNav />
      <div className="bg-surface px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link to="/student/learning" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-600 hover:underline">← All components</Link>
            <span className="text-sm text-ink-soft">{i + 1} of {LEARN.length} {isDone(prog) && "· ✓ Completed"}</span>
          </div>

          <section className="fade-up overflow-hidden rounded-lg bg-white shadow-card">
            <div className="grid gap-4 p-5 sm:p-8 md:grid-cols-2 md:items-center">
              <div className="flex h-60 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-white sm:h-80"><img src={c.img} alt={c.name} className="float-y max-h-full max-w-full object-contain" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{c.cat}</p>
                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{c.name}</h1>
                <p className="mt-3 leading-relaxed text-ink-soft">{c.summary}</p>
                {c.imgNote && <p className="mt-2 text-xs text-ink-faint">{c.imgNote}</p>}
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Lesson progress"><div className="h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} /></div>
                <p className="mt-1 text-xs text-ink-soft">{pct}% of this lesson done</p>
                {stage < 0 && <button type="button" className="btn-primary mt-5 w-full sm:w-auto" onClick={() => go(0)}>{prog.stages.length ? "Continue learning" : "Start learning"}</button>}
              </div>
            </div>
          </section>

          {stage >= 0 && <>
            <nav aria-label="Lesson stages" className="scroll-x flex gap-2 pb-1">{STAGES.map((s, n) => (
              <button key={s} type="button" aria-current={stage === n} onClick={() => go(n)} className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full border px-4 text-sm font-semibold ${stage === n ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-ink-soft hover:border-brand-500"}`}>{prog.stages.includes(n) && stage !== n ? "✓ " : `${n + 1}. `}{s}</button>))}</nav>

            <Panel title={STAGES[stage]} delay={0}>
              <div key={`${stage}-${run}`} className="fade-up">
                {stage === 0 && <div className="space-y-4"><div><h3 className="font-semibold">What it is</h3><p className="mt-1 leading-relaxed text-ink-soft">{c.summary}</p></div>
                  <div><h3 className="font-semibold">How we use it in embedded IoT</h3><ul className="mt-1 list-disc space-y-1.5 pl-5 text-ink-soft">{c.uses.map((u) => <li key={u}>{u}</li>)}</ul></div>
                  <p className="rounded-md border border-brand-100 bg-brand-50 p-4 text-sm"><strong>Tip: </strong>{c.tip}</p></div>}
                {stage === 1 && <div className="space-y-3"><p className="text-ink-soft">These are the pins on the {c.name} and what each one is used for.</p>
                  <dl className="divide-y divide-line rounded-md border border-line">{c.pins.map(([n, f]) => <div key={n} className="flex flex-col gap-0.5 p-3 sm:flex-row sm:gap-4"><dt className="font-semibold text-brand-700 sm:w-44 sm:shrink-0">{n}</dt><dd className="min-w-0 text-ink-soft">{f}</dd></div>)}</dl></div>}
                {stage === 2 && <div className="space-y-4"><Scene c={c} step={step} />
                  <ol className="space-y-2">{c.steps.map((s, n) => <li key={s}><button type="button" onClick={() => { setStep(n); setPlay(false); }} className={`flex min-h-11 w-full items-start gap-3 rounded-md border p-3 text-left text-sm ${n === step ? "border-brand-500 bg-brand-50" : "border-line bg-white"}`}><span className="font-bold text-brand-600">{n + 1}</span><span>{s}</span></button></li>)}</ol>
                  <div className="flex flex-wrap gap-2"><button type="button" className="btn-outline" onClick={() => setStep((s) => (s + c.steps.length - 1) % c.steps.length)}>◀ Step</button><button type="button" className="btn-outline" onClick={() => setPlay((p) => !p)}>{play ? "Pause" : "Play"}</button><button type="button" className="btn-outline" onClick={() => setStep((s) => (s + 1) % c.steps.length)}>Step ▶</button></div></div>}
              </div>
            </Panel>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" className="btn-outline" disabled={stage === 0} onClick={() => go(stage - 1)}>← Previous</button>
              <button type="button" className="btn-outline" onClick={() => { setStep(0); setPlay(true); setRun((r) => r + 1); }}>↻ Replay</button>
              {stage < STAGES.length - 1 ? <button type="button" className="btn-primary" onClick={() => go(stage + 1)}>Next →</button> : <Link to={`/student/components/${next.slug}`} className="btn-primary">Next component →</Link>}
            </div>
          </>}

          <div className="flex flex-wrap justify-between gap-2 text-sm font-semibold text-brand-600">
            <Link to={`/student/components/${prev.slug}`} className="inline-flex min-h-11 items-center hover:underline">← {prev.name}</Link>
            <Link to={`/student/components/${next.slug}`} className="inline-flex min-h-11 items-center hover:underline">{next.name} →</Link>
          </div>
        </div>
      </div>
    </>
  );
}
