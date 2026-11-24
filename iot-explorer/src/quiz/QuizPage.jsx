import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Lock, Award } from 'lucide-react';
import StudentNav from '../components/student/StudentNav';
import ProgressBar from '../components/student/ProgressBar';
import { api, ApiError } from '../lib/api';
import { PROJECTS, getProject } from '../simulation/projects/index.js';
import { projectQuestions } from './quizData.js';
import './quiz.css';

const PASS = 60;
const Shell = ({ children }) => (
  <>
    <StudentNav />
    <div className="bg-surface px-4 py-6 sm:px-8 sm:py-10"><div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">{children}</div></div>
  </>
);

// One quiz run: questions one at a time, then the score is saved to the server (points on the first pass; the only certificate comes from the Final Assessment).
function Run({ id, title }) {
  // Options are shuffled once per run (the stored question lists the right answer first).
  const qs = useMemo(() => projectQuestions(id).map((x) => {
    const o = x.o.map((text, k) => ({ text, ok: k === x.a })).sort(() => Math.random() - 0.5);
    return { q: x.q, o: o.map((z) => z.text), a: o.findIndex((z) => z.ok) };
  }), [id]);
  const [i, setI] = useState(0), [score, setScore] = useState(0), [pick, setPick] = useState(null), [fin, setFin] = useState(false);
  const [saved, setSaved] = useState(null), [error, setError] = useState('');
  const q = qs[i];

  const save = useCallback(async (s) => {
    setError('');
    try { setSaved(await api(`/student/quizzes/${id}/result`, { body: { score: s, total: qs.length } })); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Could not save your result.'); }
  }, [id, qs.length]);

  const choose = (k) => { if (pick === null) { setPick(k); if (k === q.a) setScore((s) => s + 1); } };
  const next = () => {
    if (i + 1 < qs.length) { setI(i + 1); setPick(null); return; }
    setFin(true); save(score);
  };
  const again = () => { setI(0); setScore(0); setPick(null); setFin(false); setSaved(null); setError(''); };

  if (fin) {
    const percent = Math.round((score / qs.length) * 100);
    const passed = percent >= PASS;
    return (
      <section className="fade-up rounded-lg bg-white p-5 text-center shadow-card sm:p-8">
        <h2 className="text-2xl font-bold">{passed ? 'You passed!' : 'Keep practicing!'}</h2>
        <p className="mt-2 text-ink-soft">You scored {score} out of {qs.length} ({percent}%). You need {PASS}% to pass.</p>
        {saved?.pointsAwarded > 0 && <p className="mt-2 text-sm font-semibold text-brand-600">+{saved.pointsAwarded} points earned</p>}
        {error && (
          <div role="alert" className="mx-auto mt-4 max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p>{error}</p><button type="button" className="btn-outline mt-3" onClick={() => save(score)}>Try saving again</button>
          </div>
        )}
        {passed && saved && <p className="mt-3 text-sm text-ink-soft">Quiz passed. Finish the General IoT quiz and one project quiz to unlock the <Link to="/student/final-assessment" className="font-semibold text-brand-600 underline">Final Assessment</Link>.</p>}
        {passed && !saved && !error && <p role="status" className="mt-4 text-sm text-ink-soft">Saving your result…</p>}
        <div className="no-print mt-6 flex flex-wrap justify-center gap-3">
          {!passed && <button type="button" className="btn-primary" onClick={again}>Try again</button>}
          <Link to="/student/quizzes" className="btn-outline">All quizzes</Link>
        </div>
      </section>
    );
  }
  return (
    <section key={i} className="fade-up rounded-lg bg-white p-5 shadow-card sm:p-8">
      <div className="mb-4 max-w-md">
        <div className="mb-2 flex justify-between text-sm font-semibold"><span>Question {i + 1} of {qs.length}</span></div>
        <ProgressBar percent={(i / qs.length) * 100} label="Quiz progress" />
      </div>
      <h2 className="text-xl font-semibold">{q.q}</h2>
      <div className="mt-4 grid gap-3">
        {q.o.map((o, k) => {
          const state = pick === null ? 'border-line bg-white hover:border-brand-500 hover:bg-brand-50' : k === q.a ? 'border-green-600 bg-green-50 text-green-800' : pick === k ? 'border-red-600 bg-red-50 text-red-800' : 'border-line bg-white text-ink-faint';
          return <button key={o} type="button" disabled={pick !== null} onClick={() => choose(k)} className={`min-h-12 rounded-md border px-4 py-3 text-left text-base font-medium transition-colors ${state}`}>{o}</button>;
        })}
      </div>
      {pick !== null && <button type="button" className="btn-primary mt-5" onClick={next}>{i + 1 < qs.length ? 'Next' : 'Finish'}</button>}
    </section>
  );
}

// Entry to the Final Assessment: locked until the General quiz and one project quiz are passed.
function FinalCard({ final }) {
  const cert = final?.certificate, open = !!final?.eligible;
  const passed = !!final?.passed || !!cert, failed = !passed && final?.state === 'failed';
  return (
    <section className="fade-up flex flex-col gap-4 rounded-lg border border-brand-500 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {passed ? <Award size={20} className="text-green-700" /> : open ? <Award size={20} className="text-brand-600" /> : <Lock size={20} className="text-ink-faint" />}
          <h2 className="text-xl font-bold">Final Assessment</h2>
          {passed && <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800"><CheckCircle2 size={13} />Certificate earned</span>}
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {passed ? 'You passed. Open it to confirm your name and download your certificate.'
            : failed ? `Your last attempt scored ${final.lastPercent}%. You need 60%. You can retake it as many times as you need.`
            : open ? '50 random questions. Score 60% or more to earn your certificate.'
            : `Locked: ${final?.generalPassed ? '✓' : '○'} General IoT quiz passed · ${final && final.projectQuizzesPassed >= 1 ? '✓' : '○'} at least one project quiz passed`}
        </p>
      </div>
      {open || passed
        ? <Link to="/student/final-assessment" className="btn-primary shrink-0">{passed ? 'Generate Certificate' : failed ? 'Retake Final Assessment' : 'Start Final Assessment'}</Link>
        : <span className="btn-outline pointer-events-none shrink-0 opacity-60" aria-disabled="true">Locked</span>}
    </section>
  );
}

export default function QuizPage() {
  const { projectId } = useParams();
  const [data, setData] = useState(null);
  useEffect(() => {
    if (projectId) return;
    Promise.all([api('/student/quizzes'), api('/student/final-assessment').catch(() => null)])
      .then(([q, f]) => setData({ ...q, final: f }))
      .catch(() => setData({ results: [], passed: [], final: null }));
  }, [projectId]);

  if (projectId) {
    const p = getProject(projectId);
    if (!p && projectId !== 'general') {
      return <Shell><section className="rounded-lg bg-white p-5 shadow-card sm:p-8"><p>Quiz not found.</p><Link to="/student/quizzes" className="btn-primary mt-4">All quizzes</Link></section></Shell>;
    }
    const name = p ? p.name.replace(' (Arduino UNO)', '') : 'General IoT quiz';
    return (
      <Shell>
        <section className="fade-up rounded-lg border border-brand-100 bg-brand-50 p-5 sm:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl">{name}</h1>
          <p className="mt-1 text-ink-soft">Score {PASS}% or more to earn points.</p>
        </section>
        <Run key={projectId} id={projectId} title={p ? p.name : 'IoT Explorer General Quiz'} />
      </Shell>
    );
  }

  const passed = (id) => !!data?.passed?.includes(id);
  const best = (id) => data?.results.find((r) => r.quizId === id)?.best;
  const list = [{ id: 'general', name: 'General IoT quiz', note: 'Parts, pins and safety' }, ...PROJECTS.map((p) => ({ id: p.id, name: p.name.replace(' (Arduino UNO)', ''), note: p.category }))];
  const done = list.filter((q) => passed(q.id)).length;
  return (
    <Shell>
      <section className="fade-up rounded-lg border border-brand-100 bg-brand-50 p-5 sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Quizzes</h1>
        <p className="mt-1 text-ink-soft">Score {PASS}% or more to earn points. Pass the General IoT quiz and any one project quiz to unlock the Final Assessment.</p>
        {data && (
          <div className="mt-5 max-w-md">
            <div className="mb-2 flex items-baseline justify-between text-sm font-semibold"><span>{done} of {list.length} quizzes passed</span><span className="text-ink-soft">{Math.round((done / list.length) * 100)}%</span></div>
            <ProgressBar percent={(done / list.length) * 100} label="Quizzes passed" />
          </div>
        )}
        {!data && <p role="status" className="mt-4 text-sm text-ink-soft">Loading your results…</p>}
      </section>
      {data && <FinalCard final={data.final} />}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((q, i) => (
          <li key={q.id} className="fade-up card-hover flex min-w-0 flex-col justify-between rounded-lg border border-line bg-white p-4" style={{ '--d': `${i * 40}ms` }}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-ink-faint">{q.note}</span>
              {passed(q.id) && <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800"><CheckCircle2 size={13} />Passed</span>}
            </div>
            <h3 className="mt-3 text-lg font-semibold leading-tight">{q.name}</h3>
            {best(q.id) !== undefined && <p className="mt-1 text-sm text-ink-faint">Best score {best(q.id)}%</p>}
            <Link to={`/student/quizzes/${q.id}`} className={`${passed(q.id) ? 'btn-outline' : 'btn-primary'} mt-4 w-full`}>{passed(q.id) ? 'Take again' : 'Start quiz'}</Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
