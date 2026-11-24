import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { Card, Notice, StatusBadge, fmtDate } from "./ui";

interface Detail {
  student: { id: string; name: string; email: string; standard: number; schoolName: string; school: { id: string; name: string } | null; isActive: boolean; createdAt: string };
  progress: {
    points: number;
    lessons: { total: number; completed: number; items: { id: string; title: string; completed: boolean; completedAt: string | null }[] };
    simulations: { projectSlug: string; attempts: number; bestScore: number; completed: boolean; lastAttemptAt: string | null }[];
    quizResults: { quizId: string; score: number; total: number; percent: number; takenAt: string }[];
  };
}

export default function StudentDetailPage() {
  const { id } = useParams();
  const [d, setD] = useState<Detail | null>(null);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ name: "", standard: "8", schoolId: "" });
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api<Detail>(`/admin/students/${id}`).then((r) => {
    setD(r); setForm({ name: r.student.name, standard: String(r.student.standard), schoolId: r.student.school?.id ?? "" });
  }).catch((e: ApiError) => setMsg({ tone: "error", text: e.message })), [id]);
  useEffect(() => { load(); api<{ items: { id: string; name: string }[] }>("/admin/schools?limit=100").then((r) => setSchools(r.items)).catch(() => {}); }, [load]);

  const save = async (body: Record<string, unknown>, okText: string) => {
    setBusy(true); setMsg(null);
    try { await api(`/admin/students/${id}`, { method: "PATCH", body }); setMsg({ tone: "ok", text: okText }); await load(); }
    catch (e) { setMsg({ tone: "error", text: e instanceof ApiError ? Object.values(e.fields ?? {})[0] ?? e.message : "Could not save." }); }
    finally { setBusy(false); }
  };
  const onSubmit = (e: FormEvent) => { e.preventDefault(); save({ name: form.name, standard: Number(form.standard), schoolId: form.schoolId || null }, "Student details saved."); };

  if (!d) return msg ? <Notice tone="error">{msg.text}</Notice> : <p className="text-ink-soft" role="status">Loading…</p>;
  const { student: s, progress: p } = d;
  return (
    <div className="space-y-6">
      <Link to="/admin/students" className="text-sm font-medium text-brand-600 hover:underline">← Back to students</Link>
      <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold">{s.name}</h1><StatusBadge active={s.isActive} /></div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <Card title="Details" action={
        <button type="button" disabled={busy} className="btn-outline !min-h-10 !px-4" onClick={() => { if (s.isActive && !window.confirm(`Deactivate ${s.name}? They will not be able to log in.`)) return; save({ isActive: !s.isActive }, s.isActive ? "Account deactivated." : "Account activated."); }}>{s.isActive ? "Deactivate account" : "Activate account"}</button>}>
        <p className="mb-4 text-sm text-ink-soft">{s.email} · joined {fmtDate(s.createdAt)}{!s.school && <> · registered school name: <strong>{s.schoolName}</strong> (not linked)</>}</p>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-3">
          <div><label className="field-label" htmlFor="sn">Name</label><input id="sn" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} maxLength={80} /></div>
          <div><label className="field-label" htmlFor="ss">Standard</label><select id="ss" className="input" value={form.standard} onChange={(e) => setForm({ ...form, standard: e.target.value })}>{[8, 9, 10, 11, 12].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>
          <div><label className="field-label" htmlFor="sc">School</label><select id="sc" className="input" value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })}><option value="">Not linked</option>{schools.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="sm:col-span-3"><button className="btn-primary" disabled={busy}>Save changes</button></div>
        </form>
      </Card>

      <Card title="Learning progress">
        <p className="mb-3 text-sm text-ink-soft">{p.lessons.completed} of {p.lessons.total} lessons completed · {p.points} points</p>
        <ul className="grid gap-2 sm:grid-cols-2">{p.lessons.items.map((l) => <li key={l.id} className="flex justify-between rounded-md bg-surface px-3 py-2 text-sm"><span>{l.title}</span><span className={l.completed ? "font-medium text-green-700" : "text-ink-faint"}>{l.completed ? `Done ${fmtDate(l.completedAt)}` : "Not started"}</span></li>)}</ul>
      </Card>

      <Card title="Simulation activity">
        {p.simulations.length === 0 ? <Notice>No simulation attempts yet.</Notice> : (
          <div className="scroll-x"><table className="w-full min-w-[480px] text-left text-sm"><thead className="border-b border-line text-ink-soft"><tr><th className="py-2">Project</th><th>Attempts</th><th>Best score</th><th>Completed</th><th>Last attempt</th></tr></thead>
            <tbody>{p.simulations.map((x) => <tr key={x.projectSlug} className="border-b border-line/60"><td className="py-2">{x.projectSlug}</td><td>{x.attempts}</td><td>{x.bestScore}</td><td>{x.completed ? "Yes" : "No"}</td><td>{fmtDate(x.lastAttemptAt)}</td></tr>)}</tbody></table></div>
        )}
      </Card>

      <Card title="Quiz results">
        {p.quizResults.length === 0 ? <Notice>No quizzes taken yet.</Notice> : (
          <div className="scroll-x"><table className="w-full min-w-[420px] text-left text-sm"><thead className="border-b border-line text-ink-soft"><tr><th className="py-2">Quiz</th><th>Score</th><th>Percent</th><th>Taken</th></tr></thead>
            <tbody>{p.quizResults.map((r, i) => <tr key={i} className="border-b border-line/60"><td className="py-2">{r.quizId}</td><td>{r.score}/{r.total}</td><td>{r.percent}%</td><td>{fmtDate(r.takenAt)}</td></tr>)}</tbody></table></div>
        )}
      </Card>
    </div>
  );
}
