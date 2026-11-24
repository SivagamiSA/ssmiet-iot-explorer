import { useCallback, useEffect, useState, type CSSProperties } from "react";
import StudentNav from "../../components/student/StudentNav";
import Panel from "../../components/student/Panel";
import ProgressBar from "../../components/student/ProgressBar";
import { api, ApiError } from "../../lib/api";
import { Link } from "react-router-dom";
import { lessonById } from "../../data/lessons";
import ComponentExplorer from "../../learn/Explorer";

interface Lessons {
  total: number; completed: number; percent: number;
  items: { id: string; title: string; completed: boolean; completedAt: string | null }[];
}

/** Learning Phase: where a student lands after logging in. Lists every lesson with saved progress. */
export default function LearningPage() {
  const [data, setData] = useState<Lessons | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    api<Lessons>("/student/lessons").then(setData).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load your lessons."));
  }, []);
  useEffect(load, [load]);

  const next = data?.items.find((l) => !l.completed);

  return (
    <>
      <StudentNav />
      <div className="bg-surface px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
          <section className="fade-up rounded-lg border border-brand-100 bg-brand-50 p-5 sm:p-8">
            <h1 className="text-2xl font-bold sm:text-3xl">Learning</h1>
            <p className="mt-1 text-ink-soft">Your progress status, the component explorer and your lessons, all in one place.</p>
            {data && (
              <div className="mt-5 max-w-md">
                <div className="mb-2 flex items-baseline justify-between text-sm font-semibold"><span>{data.completed} of {data.total} lessons completed</span><span className="text-ink-soft">{data.percent}%</span></div>
                <ProgressBar percent={data.percent} label="Lessons completed" />
              </div>
            )}
            {!data && !error && <p role="status" className="mt-4 text-sm text-ink-soft">Loading your progress…</p>}
          </section>
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">
              <p>{error}</p>
              <button type="button" className="btn-outline mt-4" onClick={load}>Try again</button>
            </div>
          )}
          <ComponentExplorer />
          {data && (
            <Panel title="Lessons" delay={100}>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.items.map((l, i) => (
                  <li key={l.id} className="fade-up card-hover flex min-w-0 flex-col justify-between rounded-lg border border-line bg-white p-4" style={{ "--d": `${150 + i * 60}ms` } as CSSProperties}>
                    <div className="flex items-center justify-between gap-3">
                      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 font-display font-semibold text-brand-600">{i + 1}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${l.completed ? "bg-green-50 text-green-800" : next?.id === l.id ? "bg-brand-100 text-brand-700" : "bg-surface text-ink-soft"}`}>{l.completed ? "Completed" : next?.id === l.id ? "Up next" : "Not started"}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold leading-tight">{l.title}</h3>
                    {lessonById(l.id) && <p className="mt-1 text-sm text-ink-faint">About {lessonById(l.id)!.minutes} min</p>}
                    {lessonById(l.id)
                      ? <Link to={`/student/learning/${l.id}`} className={`${l.completed ? "btn-outline" : "btn-primary"} mt-4 w-full`}>{l.completed ? "Review lesson" : next?.id === l.id ? "Start lesson" : "Open lesson"}</Link>
                      : <p className="mt-4 text-sm text-ink-faint">Content coming soon.</p>}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
