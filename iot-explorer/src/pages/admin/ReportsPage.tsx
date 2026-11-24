import { useEffect, useState } from "react";
import { api, ApiError, downloadFile } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { can } from "../../lib/permissions";
import { Card, Notice } from "./ui";

interface Report {
  generatedAt: string;
  students: { total: number; active: number; inactive: number; withProgress: number; byStandard: { standard: number; count: number }[]; topSchools: { name: string; count: number }[]; registrationsByMonth: { month: string; count: number }[] };
  lessons: { id: string; title: string; completedBy: number }[];
  simulations: { projectSlug: string; students: number; attempts: number; completed: number }[];
  quizzes: { taken: number; average: number; byQuiz: { quizId: string; taken: number; average: number }[] };
  projects: { total: number; byStatus: Record<string, number>; byDifficulty: Record<string, number> };
  components: { total: number; visible: number };
}

/** A simple horizontal bar list (no chart library needed). */
function Bars({ rows, unit = "" }: { rows: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.every((r) => r.value === 0)) return <p className="text-sm text-ink-soft">No data recorded yet.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex justify-between gap-3"><span className="min-w-0 truncate">{r.label}</span><span className="font-semibold">{r.value}{unit}</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-brand-50"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

const Stat = ({ title, value, note }: { title: string; value: string | number; note?: string }) => (
  <li className="rounded-lg bg-white p-5 shadow-card"><p className="text-sm font-semibold text-ink-soft">{title}</p><p className="mt-1 font-display text-3xl font-bold">{value}</p>{note && <p className="mt-1 text-sm text-ink-faint">{note}</p>}</li>
);

export default function ReportsPage() {
  const { user } = useAuth();
  const [d, setD] = useState<Report | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  useEffect(() => { api<Report>("/admin/reports/overview").then(setD).catch((e: ApiError) => setMsg({ tone: "error", text: e.message })); }, []);

  const exportCsv = async () => {
    setMsg(null);
    try { await downloadFile("/admin/reports/students.csv", "students.csv"); setMsg({ tone: "ok", text: "students.csv downloaded." }); }
    catch (e) { setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "Download failed." }); }
  };

  if (!d) return msg ? <Notice tone="error">{msg.text}</Notice> : <p className="text-ink-soft" role="status">Loading…</p>;
  const s = d.students;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Reports &amp; Analytics</h1><p className="text-sm text-ink-faint">Calculated from live records · {new Date(d.generatedAt).toLocaleString()}</p></div>
        {can(user, "reports.manage") && <button type="button" className="btn-outline" onClick={exportCsv}>Export students (CSV)</button>}
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="Students" value={s.total} note={`${s.active} active · ${s.inactive} inactive`} />
        <Stat title="Started learning" value={s.withProgress} note="students with a progress record" />
        <Stat title="Projects" value={d.projects.total} note={`${d.projects.byStatus.approved ?? 0} approved · ${d.projects.byStatus.pending ?? 0} pending`} />
        <Stat title="Components" value={d.components.total} note={`${d.components.visible} visible to students`} />
      </ul>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Registrations (last 12 months)"><Bars rows={s.registrationsByMonth.map((m) => ({ label: m.month, value: m.count }))} /></Card>
        <Card title="Students by standard"><Bars rows={s.byStandard.map((r) => ({ label: `Standard ${r.standard}`, value: r.count }))} /></Card>
        <Card title="Top schools"><Bars rows={s.topSchools.map((r) => ({ label: r.name, value: r.count }))} /></Card>
        <Card title="Lesson completion"><Bars rows={d.lessons.map((l) => ({ label: l.title, value: l.completedBy }))} /></Card>
        <Card title="Simulation attempts by project"><Bars rows={d.simulations.map((x) => ({ label: `${x.projectSlug} (${x.completed} completed)`, value: x.attempts }))} /></Card>
        <Card title="Quizzes"><p className="mb-3 text-sm text-ink-soft">{d.quizzes.taken} attempt(s) · average score {d.quizzes.average}%</p><Bars rows={d.quizzes.byQuiz.map((q) => ({ label: q.quizId, value: q.average }))} unit="%" /></Card>
        <Card title="Projects by difficulty"><Bars rows={Object.entries(d.projects.byDifficulty).map(([label, value]) => ({ label, value }))} /></Card>
      </div>
    </div>
  );
}
