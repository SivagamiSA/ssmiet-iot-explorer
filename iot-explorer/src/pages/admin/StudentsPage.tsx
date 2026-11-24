import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { Card, Notice, Pager, StatusBadge, fmtDate, useDebounced, type Paged } from "./ui";

export interface StudentRow { id: string; name: string; email: string; standard: number; schoolName: string; school: { id: string; name: string } | null; isActive: boolean; createdAt: string }
interface SchoolOpt { id: string; name: string }

export default function StudentsPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const dq = useDebounced(q);
  const [page, setPage] = useState(1);
  const schoolId = params.get("schoolId") ?? "", standard = params.get("standard") ?? "", status = params.get("status") ?? "";
  const [schools, setSchools] = useState<SchoolOpt[]>([]);
  const [data, setData] = useState<Paged<StudentRow> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { api<Paged<SchoolOpt>>("/admin/schools?limit=100").then((r) => setSchools(r.items)).catch(() => {}); }, []);
  useEffect(() => { setPage(1); }, [dq, schoolId, standard, status]);
  useEffect(() => {
    const qs = new URLSearchParams({ page: String(page), limit: "20" });
    if (dq) qs.set("q", dq); if (schoolId) qs.set("schoolId", schoolId); if (standard) qs.set("standard", standard); if (status) qs.set("status", status);
    let stale = false;
    api<Paged<StudentRow>>(`/admin/students?${qs}`).then((r) => { if (!stale) { setData(r); setError(""); } }).catch((e: ApiError) => { if (!stale) setError(e.message); });
    return () => { stale = true; };
  }, [page, dq, schoolId, standard, status]);

  const setFilter = (key: string, value: string) => { const p = new URLSearchParams(params); if (value) p.set(key, value); else p.delete(key); setParams(p, { replace: true }); };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Students</h1>
      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input className="input" type="search" placeholder="Search name, email or school" aria-label="Search students" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" aria-label="Filter by school" value={schoolId} onChange={(e) => setFilter("schoolId", e.target.value)}>
            <option value="">All schools</option><option value="none">No school linked</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" aria-label="Filter by standard" value={standard} onChange={(e) => setFilter("standard", e.target.value)}>
            <option value="">All standards</option>{[8, 9, 10, 11, 12].map((n) => <option key={n} value={n}>Standard {n}</option>)}
          </select>
          <select className="input" aria-label="Filter by status" value={status} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </div>
        {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
        <div className="scroll-x mt-4">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-ink-soft"><tr><th className="py-2 pr-3">Name</th><th className="pr-3">School</th><th className="pr-3">Std</th><th className="pr-3">Status</th><th className="pr-3">Joined</th><th /></tr></thead>
            <tbody>
              {data?.items.map((s) => (
                <tr key={s.id} className="border-b border-line/60">
                  <td className="py-3 pr-3"><span className="font-medium">{s.name}</span><br /><span className="text-ink-faint">{s.email}</span></td>
                  <td className="pr-3">{s.school?.name ?? <span title="Not linked to a school record yet">{s.schoolName} <span className="text-xs text-ink-faint">(unlinked)</span></span>}</td>
                  <td className="pr-3">{s.standard}</td><td className="pr-3"><StatusBadge active={s.isActive} /></td><td className="pr-3">{fmtDate(s.createdAt)}</td>
                  <td className="text-right"><Link className="font-medium text-brand-600 hover:underline" to={`/admin/students/${s.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.items.length === 0 && <div className="mt-4"><Notice>No students match these filters.</Notice></div>}
          {!data && !error && <p className="py-6 text-ink-soft" role="status">Loading…</p>}
        </div>
        {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </Card>
    </div>
  );
}
