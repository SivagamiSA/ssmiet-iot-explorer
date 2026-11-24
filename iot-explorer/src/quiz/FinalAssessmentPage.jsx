import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Lock, Circle } from 'lucide-react';
import StudentNav from '../components/student/StudentNav';
import ProgressBar from '../components/student/ProgressBar';
import { api, ApiError } from '../lib/api';
import FinalCertificate from './FinalCertificate.jsx';
import './quiz.css';

const Shell = ({ children }) => (
  <>
    <StudentNav />
    <div className="bg-surface px-4 py-6 sm:px-8 sm:py-10"><div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">{children}</div></div>
  </>
);
const errText = (e, fallback) => (e instanceof ApiError ? e.message : fallback);
const Alert = ({ children }) => <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{children}</div>;

function Requirement({ done, children }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {done ? <CheckCircle2 size={18} className="shrink-0 text-green-700" /> : <Circle size={18} className="shrink-0 text-ink-faint" />}
      <span className={done ? 'font-semibold text-green-800' : 'text-ink-soft'}>{children}</span>
    </li>
  );
}

// Certificate name can be edited before generation. Preview uses the existing blue template.
function CertificateSection({ cert, onChange, justPassed }) {
  const [draft, setDraft] = useState(cert.name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const top = useRef(null);
  useEffect(() => { if (justPassed) top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [justPassed]);
  const clean = draft.replace(/\s+/g, ' ').trim();
  const generate = async () => {
    setBusy(true); setError('');
    try {
      const r = await api('/student/final-assessment/certificate', { method: 'POST', body: { name: clean } });
      onChange(r.certificate);
    } catch (e) { setError(errText(e, 'Could not generate the certificate. Please try again.')); }
    finally { setBusy(false); }
  };
  return (
    <section ref={top} className="fade-up scroll-mt-24 rounded-lg bg-white p-5 shadow-card sm:p-8">
      <h2 className="text-2xl font-bold">Your certificate</h2>
      <p className="mt-1 text-sm font-semibold text-green-800">Final Assessment passed — your result is locked permanently.</p>
      {!cert.generated && (
        <div className="mt-3 max-w-xl rounded-lg border border-brand-100 bg-brand-50 p-4">
          <label htmlFor="cert-name" className="text-sm font-semibold">Name to print on your certificate</label>
          <input id="cert-name" type="text" value={draft} maxLength={60} autoComplete="name" disabled={busy}
            onChange={(e) => { setDraft(e.target.value); setError(''); }}
            className="mt-1 block min-h-11 w-full rounded-md border border-line bg-white px-3 text-base" />
          <p className="mt-2 text-xs text-ink-soft">Check the spelling in the preview. Your name will be saved when you generate the certificate.</p>
          {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
          <button type="button" className="btn-primary mt-3" disabled={busy || clean.length < 2} onClick={generate}>{busy ? 'Generating…' : 'Generate Certificate'}</button>
        </div>
      )}
      {cert.generated && <p className="mt-2 text-sm text-ink-soft">Your certificate is ready. You can preview and download the PDF.</p>}
      <div className="mt-5">
        <FinalCertificate name={cert.generated ? cert.name : (clean || cert.name)} schoolName={cert.schoolName} standard={cert.standard} issuedAt={cert.issuedAt} canDownload={!!cert.generated} />
      </div>
    </section>
  );
}

// One attempt: 10 questions, one at a time, no answers revealed. Graded on the server when submitted.
function Exam({ attempt, onDone, onStale }) {
  const { attemptId, questions } = attempt;
  const storeKey = `final-assessment-${attemptId}`;
  const saved = useMemo(() => { try { return JSON.parse(sessionStorage.getItem(storeKey) || 'null'); } catch { return null; } }, [storeKey]);
  const [answers, setAnswers] = useState(() => (saved?.answers?.length === questions.length ? saved.answers : questions.map(() => null)));
  const [i, setI] = useState(saved?.i ?? 0);
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const q = questions[i];
  const answered = answers.filter((a) => a !== null).length;

  useEffect(() => { try { sessionStorage.setItem(storeKey, JSON.stringify({ answers, i })); } catch { /* storage blocked */ } }, [answers, i, storeKey]);

  const pick = (k) => setAnswers((a) => a.map((v, n) => (n === i ? k : v)));
  const go = (n) => { setI(n); setConfirm(false); };
  const submit = async () => {
    setBusy(true); setError('');
    try { const r = await api('/student/final-assessment/submit', { body: { attemptId, answers } }); try { sessionStorage.removeItem(storeKey); } catch { /* ignore */ } onDone(r); }
    catch (e) {
      // The attempt was replaced / already closed (e.g. another tab): drop it and go back to the start screen so a fresh attempt can begin.
      const code = e instanceof ApiError ? e.fields?.code : null;
      if (code === 'ATTEMPT_EXPIRED' || code === 'ATTEMPT_NOT_FOUND' || code === 'ALREADY_PASSED') {
        try { sessionStorage.removeItem(storeKey); } catch { /* ignore */ }
        onStale(errText(e, 'This attempt is no longer active.'));
        return;
      }
      setError(errText(e, 'Could not submit. Please try again.'));
    }
    finally { setBusy(false); }
  };
  const allAnswered = answered === questions.length;

  return (
    <section className="fade-up rounded-lg bg-white p-5 shadow-card sm:p-8">
      <div className="mb-4 max-w-md">
        <div className="mb-2 flex justify-between text-sm font-semibold"><span>Question {i + 1} of {questions.length}</span><span className="text-ink-soft">{answered} answered</span></div>
        <ProgressBar percent={(answered / questions.length) * 100} label="Questions answered" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{q.kind}: {q.topic}</p>
      <h2 key={i} className="mt-1 text-xl font-semibold">{q.question}</h2>
      <div className="mt-4 grid gap-3" role="radiogroup" aria-label="Answer options">
        {q.options.map((o, k) => (
          <button key={k} type="button" role="radio" aria-checked={answers[i] === k} onClick={() => pick(k)}
            className={`min-h-12 rounded-md border px-4 py-3 text-left text-base font-medium transition-colors ${answers[i] === k ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line bg-white hover:border-brand-500 hover:bg-brand-50'}`}>{o}</button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn-outline" disabled={i === 0} onClick={() => go(i - 1)}>Previous</button>
        {i + 1 < questions.length
          ? <button type="button" className="btn-primary" onClick={() => go(i + 1)}>Next</button>
          : <button type="button" className="btn-primary" onClick={() => setConfirm(true)}>Finish</button>}
        {i + 1 < questions.length && allAnswered && <button type="button" className="btn-outline" onClick={() => setConfirm(true)}>Submit now</button>}
      </div>
      {confirm && (
        <div role="alertdialog" aria-label="Submit assessment" className="mt-4 max-w-lg rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p>{allAnswered ? 'Submit your final assessment now?' : `You still have ${questions.length - answered} unanswered question${questions.length - answered === 1 ? '' : 's'}. Answer all ${questions.length} questions before submitting.`}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={busy || !allAnswered} onClick={submit}>{busy ? 'Submitting…' : 'Yes, submit'}</button>
            <button type="button" className="btn-outline" disabled={busy} onClick={() => setConfirm(false)}>Keep working</button>
          </div>
        </div>
      )}
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      <div className="mt-6 border-t border-line pt-4">
        <p className="mb-2 text-xs font-semibold text-ink-faint">Jump to a question</p>
        <div className="flex flex-wrap gap-1.5">
          {questions.map((_, n) => (
            <button key={n} type="button" onClick={() => go(n)} aria-label={`Question ${n + 1}${answers[n] !== null ? ', answered' : ''}`} aria-current={n === i ? 'true' : undefined}
              className={`h-9 w-9 rounded-md border text-xs font-semibold ${n === i ? 'border-brand-600 bg-brand-500 text-white' : answers[n] !== null ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-line bg-white text-ink-soft'}`}>{n + 1}</button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function FinalAssessmentPage() {
  const [status, setStatus] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [result, setResult] = useState(null); // answer of /submit
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError('');
    api('/student/final-assessment').then(setStatus).catch((e) => setError(errText(e, 'Could not load the final assessment.')));
  }, []);
  useEffect(load, [load]);

  const start = async () => {
    setBusy(true); setError(''); setResult(null);
    try { setAttempt(await api('/student/final-assessment/start', { method: 'POST', body: {} })); }
    catch (e) { setError(errText(e, 'Could not start the assessment.')); load(); }
    finally { setBusy(false); }
  };
  const done = (r) => { setAttempt(null); setResult(r); if (r.passed) setStatus((current) => ({ ...current, passed: true, state: 'passed' })); load(); window.scrollTo(0, 0); };
  const setCertificate = (certificate) => setStatus((s) => ({ ...s, certificate }));

  if (!status) return <Shell>{error ? <Alert>{error}</Alert> : <p role="status" className="text-sm text-ink-soft">Loading…</p>}</Shell>;
  const stale = (message) => { setAttempt(null); setResult(null); setError(message); load(); window.scrollTo(0, 0); };
  if (attempt) return <Shell><Exam key={attempt.attemptId} attempt={attempt} onDone={done} onStale={stale} /></Shell>;

  const cert = status.certificate;
  const passedLocked = status.passed || !!cert; // permanent: once passed there is no start / retake button
  const failed = (result && !result.passed) || (!passedLocked && status.state === 'failed');
  return (
    <Shell>
      <section className="fade-up rounded-lg border border-brand-100 bg-brand-50 p-5 sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Final Assessment</h1>
        <p className="mt-1 text-ink-soft">{status.questionCount} random questions from a bank of 300. Score {status.passPercent}% or more (6 correct answers) to pass.</p>
      </section>

      {error && <Alert>{error}</Alert>}

      {result?.passed && (
        <section role="status" className="fade-up rounded-lg border border-green-200 bg-green-50 p-5 text-center sm:p-8">
          <h2 className="text-2xl font-bold text-green-900">You passed!</h2>
          <p className="mt-1 text-green-900">You scored {result.score} out of {result.total} ({result.percent}%).</p>
          {result.pointsAwarded > 0 && <p className="mt-1 text-sm font-semibold text-green-800">+{result.pointsAwarded} points earned</p>}
        </section>
      )}

      {failed && (
        <section className="fade-up rounded-lg bg-white p-5 text-center shadow-card sm:p-8">
          <h2 className="text-2xl font-bold">Failed — keep practicing!</h2>
          <p className="mt-2 text-ink-soft">{result ? `You scored ${result.score} out of ${result.total} (${result.percent}%).` : `Your latest result was ${status.lastScore != null ? `${status.lastScore} out of ${status.lastTotal} (${status.lastPercent}%)` : `${status.lastPercent}%`}.`} You need {status.passPercent}% to pass.</p>
          <p className="mt-1 text-sm text-ink-faint">A new set of {status.questionCount} questions is picked every time you try.</p>
        </section>
      )}

      {passedLocked ? <CertificateSection cert={{ ...(cert || {}), name: cert?.name || status.studentName, schoolName: cert?.schoolName || status.schoolName, standard: cert?.standard || status.standard, issuedAt: cert?.issuedAt || status.completedAt, generated: !!cert }} onChange={setCertificate} justPassed={!!result?.passed} /> : (
        <section className="fade-up rounded-lg bg-white p-5 shadow-card sm:p-8">
          {!status.eligible && (
            <div className="flex items-start gap-3">
              <Lock size={22} className="mt-0.5 shrink-0 text-ink-faint" />
              <div>
                <h2 className="text-xl font-semibold">Locked</h2>
                <p className="mt-1 text-sm text-ink-soft">Finish these two steps to unlock the final assessment:</p>
              </div>
            </div>
          )}
          <ul className={`space-y-2 ${status.eligible ? '' : 'mt-4'}`}>
            <Requirement done={status.generalPassed}>Pass the General IoT quiz</Requirement>
            <Requirement done={status.projectQuizzesPassed >= 1}>Pass at least one project quiz</Requirement>
          </ul>
          {status.eligible ? (
            <div className="mt-5">
              <p className="text-sm text-ink-soft">Answers are not shown while you take it. You can move between questions and change an answer before you submit.{status.attempts > 0 && ` Your latest result was ${status.lastScore != null ? `${status.lastScore}/${status.lastTotal}` : `${status.lastPercent}%`}. Your next attempt will replace it.`}</p>
              <button type="button" className="btn-primary mt-4" disabled={busy} onClick={start}>{busy ? 'Starting…' : 'Start Final Assessment'}</button>
            </div>
          ) : (
            <Link to="/student/quizzes" className="btn-primary mt-5">Go to quizzes</Link>
          )}
        </section>
      )}
    </Shell>
  );
}
