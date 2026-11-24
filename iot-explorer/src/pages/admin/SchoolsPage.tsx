import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { Card, Notice, Pager, StatusBadge, useDebounced, type Paged } from "./ui";

interface School { id: string; name: string; city: string; district: string; isActive: boolean; studentCount: number }
type SchoolList = Paged<School> & { unlinkedStudents: number };
const BLANK = { name: "", city: "", district: "" };

export default function SchoolsPage() {
  const [q, setQ] = useState(""); const dq = useDebounced(q);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SchoolList | null>(null);
  const [editing, setEditing] = useState<School | "new" | null>(null);
  const [form, setForm] = useState(BLANK);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page: String(page), limit: "20" });
    if (dq) qs.set("q", dq); if (status) qs.set("status", status);
    return api<SchoolList>(`/admin/schools?${qs}`).then(setData).catch((e: ApiError) => setMsg({ tone: "error", text: e.message }));
  }, [page, dq, status]);
  useEffect(() => { setPage(1); }, [dq, status]);
  useEffect(() => { load(); }, [load]);

  const open = (s: School | "new") => { setEditing(s); setErrs({}); setMsg(null); setForm(s === "new" ? BLANK : { name: s.name, city: s.city, district: s.district }); };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErrs({}); setMsg(null);
    try {
      const isNew = editing === "new";
      const r = await api<{ linkedStudents?: number }>(isNew ? "/admin/schools" : `/admin/schools/${(editing as School).id}`, { method: isNew ? "POST" : "PATCH", body: form });
      setMsg({ tone: "ok", text: isNew ? `School added.${r.linkedStudents ? ` ${r.linkedStudents} existing student(s) were linked to it.` : ""}` : "School updated." });
      setEditing(null); await load();
    } catch (err) { if (err instanceof ApiError) { setErrs(err.fields ?? {}); if (!err.fields) setMsg({ tone: "error", text: err.message }); } }
    finally { setBusy(false); }
  };
  const toggle = async (s: School) => {
    try { await api(`/admin/schools/${s.id}`, { method: "PATCH", body: { isActive: !s.isActive } }); await load(); }
    catch (err) { setMsg({ tone: "error", text: err instanceof ApiError ? err.message : "Could not update." }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Schools</h1><button type="button" className="btn-primary" onClick={() => open("new")}>Add school</button></div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {data && data.unlinkedStudents > 0 && <Notice>{data.unlinkedStudents} student(s) are not linked to a school record. <Link className="font-medium text-brand-600 hover:underline" to="/admin/students?schoolId=none">View them</Link>. The terminal command <code>npm run migrate:schools</code> links them safely.</Notice>}

      {editing && (
        <Card title={editing === "new" ? "Add school" : `Edit ${editing.name}`}>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
            {([["name", "School name", true], ["city", "City", false], ["district", "District", false]] as const).map(([k, l, req]) => (
              <div key={k}><label className="field-label" htmlFor={`f-${k}`}>{l}</label>
                <input id={`f-${k}`} className="input" value={form[k]} required={req} maxLength={k === "name" ? 120 : 80} aria-invalid={!!errs[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                {errs[k] && <p role="alert" className="mt-1.5 text-sm text-red-700">{errs[k]}</p>}</div>
            ))}
            <div className="flex gap-2 sm:col-span-3"><button className="btn-primary" disabled={busy}>Save</button><button type="button" className="btn-outline" onClick={() => setEditing(null)}>Cancel</button></div>
          </form>
        </Card>
      )}

      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" type="search" placeholder="Search name, city or district" aria-label="Search schools" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </div>
        <div className="scroll-x mt-4">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line text-ink-soft"><tr><th className="py-2 pr-3">School</th><th className="pr-3">Location</th><th className="pr-3">Students</th><th className="pr-3">Status</th><th /></tr></thead>
            <tbody>{data?.items.map((s) => (
              <tr key={s.id} className="border-b border-line/60">
                <td className="py-3 pr-3 font-medium">{s.name}</td><td className="pr-3">{[s.city, s.district].filter(Boolean).join(", ") || "-"}</td>
                <td className="pr-3"><Link className="text-brand-600 hover:underline" to={`/admin/students?schoolId=${s.id}`}>{s.studentCount}</Link></td>
                <td className="pr-3"><StatusBadge active={s.isActive} /></td>
                <td className="space-x-3 whitespace-nowrap text-right"><button type="button" className="font-medium text-brand-600 hover:underline" onClick={() => open(s)}>Edit</button><button type="button" className="font-medium text-ink-soft hover:underline" onClick={() => toggle(s)}>{s.isActive ? "Deactivate" : "Activate"}</button></td>
              </tr>))}</tbody>
          </table>
          {data && data.items.length === 0 && <div className="mt-4"><Notice>No schools yet. Add one, or run the migration to create them from existing student records.</Notice></div>}
          {!data && <p className="py-6 text-ink-soft" role="status">Loading…</p>}
        </div>
        {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </Card>
    </div>
  );
}
