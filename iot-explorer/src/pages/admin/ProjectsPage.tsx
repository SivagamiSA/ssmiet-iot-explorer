import { useCallback, useEffect, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { can } from "../../lib/permissions";
import { Card, Notice, Pager, useDebounced, type Paged } from "./ui";

interface Project { id: string; slug: string; title: string; summary: string; difficulty: string; image: string; order: number; status: "pending" | "approved"; simulation: { students: number; attempts: number; completed: number } }
const BLANK = { slug: "", title: "", summary: "", difficulty: "Beginner", image: "", order: "0", status: "pending" };

export default function ProjectsPage() {
  const { user } = useAuth();
  const canEdit = can(user, "projects.manage");
  const [q, setQ] = useState(""); const dq = useDebounced(q);
  const [status, setStatus] = useState(""); const [difficulty, setDifficulty] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<Project> | null>(null);
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [form, setForm] = useState(BLANK);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page: String(page), limit: "20" });
    if (dq) qs.set("q", dq); if (status) qs.set("status", status); if (difficulty) qs.set("difficulty", difficulty);
    return api<Paged<Project>>(`/admin/projects?${qs}`).then(setData).catch((e: ApiError) => setMsg({ tone: "error", text: e.message }));
  }, [page, dq, status, difficulty]);
  useEffect(() => { setPage(1); }, [dq, status, difficulty]);
  useEffect(() => { load(); }, [load]);

  const open = (p: Project | "new") => { setEditing(p); setErrs({}); setMsg(null); setForm(p === "new" ? BLANK : { slug: p.slug, title: p.title, summary: p.summary, difficulty: p.difficulty, image: p.image, order: String(p.order), status: p.status }); };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErrs({}); setMsg(null);
    const isNew = editing === "new";
    const { slug, ...rest } = form;
    try {
      await api(isNew ? "/admin/projects" : `/admin/projects/${(editing as Project).slug}`, { method: isNew ? "POST" : "PATCH", body: { ...rest, order: Number(rest.order), ...(isNew ? { slug } : {}) } });
      setMsg({ tone: "ok", text: isNew ? "Project added." : "Project saved." }); setEditing(null); await load();
    } catch (err) { if (err instanceof ApiError) { setErrs(err.fields ?? {}); if (!err.fields) setMsg({ tone: "error", text: err.message }); } }
    finally { setBusy(false); }
  };
  const setStatusOf = async (p: Project) => {
    const next = p.status === "approved" ? "pending" : "approved";
    if (next === "pending" && !window.confirm(`Hide "${p.title}" from students? Their saved progress is kept.`)) return;
    try { await api(`/admin/projects/${p.slug}`, { method: "PATCH", body: { status: next } }); await load(); }
    catch (err) { setMsg({ tone: "error", text: err instanceof ApiError ? err.message : "Could not update." }); }
  };

  const field = (k: keyof typeof BLANK, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div><label className="field-label" htmlFor={`p-${k}`}>{label}</label>
      <input id={`p-${k}`} className="input" value={form[k]} aria-invalid={!!errs[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} {...props} />
      {errs[k] && <p role="alert" className="mt-1.5 text-sm text-red-700">{errs[k]}</p>}</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Projects</h1>{canEdit && <button type="button" className="btn-primary" onClick={() => open("new")}>Add project</button>}</div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {editing && (
        <Card title={editing === "new" ? "Add project" : `Edit ${editing.title}`}>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            {editing === "new" ? field("slug", "Slug (cannot be changed later)", { required: true, maxLength: 60, placeholder: "led-blinking" }) : <div><span className="field-label">Slug</span><p className="input bg-surface text-ink-soft">{form.slug}</p></div>}
            {field("title", "Title", { required: true, maxLength: 120 })}
            <div className="sm:col-span-2"><label className="field-label" htmlFor="p-summary">Summary</label><textarea id="p-summary" className="input" rows={2} required maxLength={400} value={form.summary} aria-invalid={!!errs.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />{errs.summary && <p role="alert" className="mt-1.5 text-sm text-red-700">{errs.summary}</p>}</div>
            <div><label className="field-label" htmlFor="p-difficulty">Difficulty</label><select id="p-difficulty" className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>{["Beginner", "Intermediate", "Advanced"].map((d) => <option key={d}>{d}</option>)}</select></div>
            <div><label className="field-label" htmlFor="p-status">Status</label><select id="p-status" className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="pending">Pending (hidden from students)</option><option value="approved">Approved (visible to students)</option></select></div>
            {field("image", "Image path", { maxLength: 200, placeholder: "/images/projects/led-blinking.jpg" })}
            {field("order", "Display order", { type: "number", min: 0, max: 9999 })}
            <div className="flex gap-2 sm:col-span-2"><button className="btn-primary" disabled={busy}>Save</button><button type="button" className="btn-outline" onClick={() => setEditing(null)}>Cancel</button></div>
          </form>
        </Card>
      )}

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <input className="input" type="search" placeholder="Search projects" aria-label="Search projects" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any status</option><option value="approved">Approved</option><option value="pending">Pending</option></select>
          <select className="input" aria-label="Filter by difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="">Any difficulty</option>{["Beginner", "Intermediate", "Advanced"].map((d) => <option key={d}>{d}</option>)}</select>
        </div>
        <div className="scroll-x mt-4">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-line text-ink-soft"><tr><th className="py-2 pr-3">Project</th><th className="pr-3">Difficulty</th><th className="pr-3">Status</th><th className="pr-3">Student activity</th>{canEdit && <th />}</tr></thead>
            <tbody>{data?.items.map((p) => (
              <tr key={p.id} className="border-b border-line/60">
                <td className="py-3 pr-3"><span className="font-medium">{p.title}</span><br /><span className="text-ink-faint">{p.slug} · order {p.order}</span></td>
                <td className="pr-3">{p.difficulty}</td>
                <td className="pr-3"><span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === "approved" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{p.status === "approved" ? "Approved" : "Pending"}</span></td>
                <td className="pr-3 text-ink-soft">{p.simulation.students} student(s) · {p.simulation.attempts} attempt(s) · {p.simulation.completed} completed</td>
                {canEdit && <td className="space-x-3 whitespace-nowrap text-right"><button type="button" className="font-medium text-brand-600 hover:underline" onClick={() => open(p)}>Edit</button><button type="button" className="font-medium text-ink-soft hover:underline" onClick={() => setStatusOf(p)}>{p.status === "approved" ? "Hide" : "Approve"}</button></td>}
              </tr>))}</tbody>
          </table>
          {data && data.items.length === 0 && <div className="mt-4"><Notice>No projects match. Run <code>npm run db:counts</code> to see what is in the database.</Notice></div>}
          {!data && <p className="py-6 text-ink-soft" role="status">Loading…</p>}
        </div>
        {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </Card>
    </div>
  );
}
