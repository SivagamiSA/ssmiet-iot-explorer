import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import StudentNav from "../../components/student/StudentNav";
import Panel from "../../components/student/Panel";
import { api, ApiError } from "../../lib/api";
import { showNotice } from "../../lib/notice";
import { LESSON_CONTENT, lessonById } from "../../data/lessons";

interface Status { items: { id: string; completed: boolean }[] }
interface Done { alreadyCompleted: boolean; pointsAwarded: number }

/** One lesson: reading content, then "Mark as complete" saves progress and awards points (once). */
export default function LessonPage() {
  const { id = "" } = useParams();
  const lesson = lessonById(id);
  const [done, setDone] = useState<boolean | null>(null); // null = still loading
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDone(null);
    api<Status>("/student/lessons").then((r) => setDone(!!r.items.find((l) => l.id === id)?.completed)).catch(() => setDone(false));
  }, [id]);

  const complete = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const r = await api<Done>(`/student/lessons/${id}/complete`, { method: "POST" });
      setDone(true);
      showNotice(r.pointsAwarded ? `Lesson complete! +${r.pointsAwarded} points` : "Lesson already completed.");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Could not save your progress. Please try again."); }
    finally { setBusy(false); }
  }, [id]);

  if (!lesson) return <Navigate to="/student/learning" replace />;
  const i = LESSON_CONTENT.findIndex((l) => l.id === id);
  const prev = LESSON_CONTENT[i - 1], next = LESSON_CONTENT[i + 1];

  return (
    <>
      <StudentNav />
      <div className="bg-surface px-4 py-6 sm:px-8 sm:py-10">
        <article className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
          <Link to="/student/learning" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-600 hover:underline">← All lessons</Link>

          <header className="fade-up rounded-lg border border-brand-100 bg-brand-50 p-5 sm:p-8">
            <p className="text-sm font-semibold text-brand-700">Lesson {i + 1} of {LESSON_CONTENT.length} · about {lesson.minutes} min{done ? " · Completed" : ""}</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{lesson.title}</h1>
            <p className="mt-3 leading-relaxed text-ink-soft">{lesson.intro}</p>
          </header>

          <Panel title="What you will learn" delay={80}>
            <ul className="list-disc space-y-1.5 pl-5 text-ink-soft">{lesson.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
          </Panel>

          {lesson.sections.map((s, n) => (
            <Panel key={s.title} title={s.title} delay={120 + n * 40}>
              <div className="space-y-3 leading-relaxed text-ink-soft">
                {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
                {s.bullets && <ul className="list-disc space-y-1.5 pl-5">{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
                {s.code && (
                  <figure>
                    <figcaption className="mb-2 text-sm font-medium text-ink">{s.code.caption}</figcaption>
                    <pre className="scroll-x rounded-md bg-ink p-4 text-sm leading-relaxed text-white"><code>{s.code.text}</code></pre>
                  </figure>
                )}
              </div>
            </Panel>
          ))}

          <Panel title="Key points" delay={200}>
            <ul className="space-y-2">{lesson.keyPoints.map((k) => <li key={k} className="flex gap-2"><span aria-hidden className="text-brand-500">✓</span><span>{k}</span></li>)}</ul>
          </Panel>

          <section className="fade-up rounded-lg bg-white p-5 shadow-card sm:p-6" style={{ "--d": "240ms" } as CSSProperties}>
            {error && <p role="alert" className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
            {done ? (
              <p role="status" className="font-semibold text-green-800">✓ You have completed this lesson.</p>
            ) : (
              <button type="button" className="btn-primary w-full sm:w-auto" onClick={complete} disabled={busy || done === null}>{busy ? "Saving…" : "Mark as complete"}</button>
            )}
            <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
              {prev ? <Link to={`/student/learning/${prev.id}`} className="btn-outline">← {prev.title}</Link> : <span />}
              {next ? <Link to={`/student/learning/${next.id}`} className="btn-outline">{next.title} →</Link>
                : <Link to="/student/components" className="btn-outline">Explore Components →</Link>}
            </div>
          </section>
        </article>
      </div>
    </>
  );
}
