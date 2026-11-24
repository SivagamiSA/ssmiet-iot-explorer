import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import StudentNav from "../../components/student/StudentNav";
import Panel, { Empty } from "../../components/student/Panel";
import ProgressBar from "../../components/student/ProgressBar";
import SafeImage from "../../components/ui/SafeImage";
import { api, ApiError } from "../../lib/api";

interface Dashboard {
  student: { name: string; schoolName: string; standard: number };
  points: number; level: number; pointsIntoLevel: number; pointsForNext: number;
  lessons: { total: number; completed: number; percent: number; completedList: { id: string; title: string; completedAt: string }[] };
  badges: { key: string; title: string; description: string; earned: boolean }[];
  simulations: { total: number; attempted: number; completed: number; items: { slug: string; title: string; attempts: number; bestScore: number; completed: boolean }[] };
  quizzes: { taken: number; average: number; best: number; recent: { quizId: string; score: number; total: number; percent: number; takenAt: string }[] };
  projects: { slug: string; title: string; summary: string; difficulty: string; image: string }[];
  projectCount: number;
  events: { id: string; title: string; date: string; location: string }[];
  certificates: { id: string; title: string; percent: number; issuedAt: string }[];
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function StudentDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    api<Dashboard>("/student/dashboard").then(setData).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load your dashboard."));
  }, []);
  useEffect(load, [load]);

  return (
    <>
      <StudentNav />
      <div className="bg-surface px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">
              <p>{error}</p>
              <button type="button" className="btn-outline mt-4" onClick={load}>Try again</button>
            </div>
          )}
          {!error && !data && (
            <div role="status" aria-label="Loading your dashboard" className="space-y-5">
              <div className="h-40 animate-pulse rounded-lg bg-white" />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-white" />)}</div>
              <span className="sr-only">Loading your dashboard…</span>
            </div>
          )}
          {data && <Content d={data} />}
        </div>
      </div>
    </>
  );
}

function Content({ d }: { d: Dashboard }) {
  const earned = d.badges.filter((b) => b.earned).length;
  const firstName = d.student.name.split(" ")[0];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Welcome + level */}
      <section className="fade-up flex flex-col gap-5 rounded-lg border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 sm:p-8 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-500 font-display text-2xl font-bold text-white sm:h-16 sm:w-16">{firstName.charAt(0).toUpperCase()}</span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">Welcome, {firstName}!</h1>
            <p className="mt-1 text-ink-soft">{d.student.schoolName} · Standard {d.student.standard}</p>
          </div>
        </div>
        <div className="w-full md:max-w-sm">
          <div className="mb-2 flex items-baseline justify-between gap-3 text-sm font-semibold">
            <span>Level {d.level}</span>
            <span className="text-right text-ink-soft">{d.pointsIntoLevel} / {d.pointsForNext} points to next level</span>
          </div>
          <ProgressBar percent={(d.pointsIntoLevel / d.pointsForNext) * 100} label="Progress to next level" />
          <Link to="/student/learning" className="btn-primary mt-4 w-full">Continue learning</Link>
        </div>
      </section>

      {/* Key numbers */}
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Points" value={d.points} i={0} />
        <Stat label="Badges" value={`${earned}/${d.badges.length}`} i={1} />
        <Stat label="Quiz average" value={d.quizzes.taken ? `${d.quizzes.average}%` : "–"} i={2} />
        <Stat label="Certificates" value={d.certificates.length} i={3} />
      </dl>

      <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-2">
        <Panel title="Learning progress" delay={200}>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-semibold">{d.lessons.completed} of {d.lessons.total} lessons</span>
            <span className="text-ink-soft">{d.lessons.percent}%</span>
          </div>
          <ProgressBar percent={d.lessons.percent} label="Lessons completed" />
          <h3 className="mt-6 text-sm font-semibold text-ink-soft">Completed lessons</h3>
          {d.lessons.completedList.length === 0
            ? <div className="mt-2"><Empty>You have not completed a lesson yet. Open Learning to start your first one.</Empty></div>
            : <ul className="mt-2 divide-y divide-line">
                {d.lessons.completedList.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2"><Tick /><span className="truncate">{l.title}</span></span>
                    <span className="shrink-0 text-ink-faint">{fmtDate(l.completedAt)}</span>
                  </li>
                ))}
              </ul>}
        </Panel>

        <Panel title="Badges" delay={270}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {d.badges.map((b) => (
              <li key={b.key} className={`card-hover rounded-md border p-3 text-center ${b.earned ? "border-brand-500 bg-brand-50" : "border-line bg-surface opacity-70"}`}>
                <span aria-hidden className={`mx-auto grid h-10 w-10 place-items-center rounded-full text-lg ${b.earned ? "bg-brand-500 text-white" : "bg-line text-ink-faint"}`}>{b.earned ? "★" : "🔒"}</span>
                <p className="mt-2 text-sm font-semibold leading-tight">{b.title}</p>
                <p className="mt-1 text-xs leading-snug text-ink-soft">{b.description}</p>
                <span className="sr-only">{b.earned ? "Earned" : "Locked"}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Available projects" delay={340}>
          {d.projects.length === 0
            ? <Empty>No projects have been approved yet. Check back soon.</Empty>
            : <ul className="grid gap-3 sm:grid-cols-2">
                {d.projects.map((p) => (
                  <li key={p.slug} className="card-hover overflow-hidden rounded-md border border-line bg-white">
                    <SafeImage src={p.image} alt={p.title} className="aspect-[16/9] w-full" />
                    <div className="p-3">
                      <p className="font-semibold leading-tight">{p.title}</p>
                      <p className="mt-1 text-xs font-medium text-brand-700">{p.difficulty}</p>
                      <p className="mt-1.5 text-sm leading-snug text-ink-soft">{p.summary}</p>
                    </div>
                  </li>
                ))}
              </ul>}
        </Panel>

        <div className="space-y-5 sm:space-y-6">
          <Panel title="Simulation progress" delay={410}>
            {d.simulations.total === 0
              ? <Empty>Simulations appear here once projects are approved.</Empty>
              : <>
                  <p className="mb-2 text-sm font-semibold">{d.simulations.completed} of {d.simulations.total} completed</p>
                  <ProgressBar percent={(d.simulations.completed / d.simulations.total) * 100} label="Simulations completed" />
                  <ul className="mt-4 divide-y divide-line">
                    {d.simulations.items.map((s) => (
                      <li key={s.slug} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <span className="flex min-w-0 items-center gap-2">{s.completed ? <Tick /> : <span aria-hidden className="h-5 w-5 shrink-0 rounded-full border border-line" />}<span className="truncate">{s.title}</span></span>
                        <span className="shrink-0 text-ink-faint">{s.attempts ? `${s.attempts} ${s.attempts === 1 ? "try" : "tries"}` : "Not started"}</span>
                      </li>
                    ))}
                  </ul>
                </>}
          </Panel>

          <Panel title="Quiz scores" delay={480}>
            {d.quizzes.recent.length === 0
              ? <Empty>You have not taken a quiz yet.</Empty>
              : <ul className="divide-y divide-line">
                  {d.quizzes.recent.map((q, i) => (
                    <li key={q.quizId + i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0 truncate">{q.quizId} · <span className="text-ink-faint">{fmtDate(q.takenAt)}</span></span>
                      <span className="shrink-0 font-semibold">{q.score}/{q.total} <span className="font-normal text-ink-soft">({q.percent}%)</span></span>
                    </li>
                  ))}
                </ul>}
          </Panel>
        </div>

        <Panel title="Upcoming events" delay={550}>
          {d.events.length === 0
            ? <Empty>No upcoming events right now.</Empty>
            : <ul className="divide-y divide-line">
                {d.events.map((e) => (
                  <li key={e.id} className="py-3">
                    <p className="font-semibold">{e.title}</p>
                    <p className="text-sm text-ink-soft">{fmtDate(e.date)}{e.location ? ` · ${e.location}` : ""}</p>
                  </li>
                ))}
              </ul>}
        </Panel>

        <Panel title="Certificates" delay={620}>
          {d.certificates.length === 0
            ? <Empty>Pass the final assessment to earn your certificate.</Empty>
            : <ul className="divide-y divide-line">
                {d.certificates.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="min-w-0"><span className="block truncate font-semibold">{c.title}</span><span className="text-ink-faint">{fmtDate(c.issuedAt)} · {c.percent}%</span></span>
                    <Link to="/student/final-assessment" className="btn-outline shrink-0">View / download</Link>
                  </li>
                ))}
              </ul>}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value, i }: { label: string; value: string | number; i: number }) {
  return (
    <div className="fade-up card-hover rounded-lg bg-white p-4 text-center shadow-card sm:p-5" style={{ "--d": `${80 + i * 70}ms` } as CSSProperties}>
      <dd className="font-display text-3xl font-bold text-brand-600">{value}</dd>
      <dt className="mt-1 text-sm text-ink-soft">{label}</dt>
    </div>
  );
}

const Tick = () => (
  <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" className="shrink-0 text-brand-500"><circle cx="10" cy="10" r="10" fill="currentColor" /><path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
