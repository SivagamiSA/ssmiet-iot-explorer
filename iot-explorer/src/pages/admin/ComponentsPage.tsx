import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { Card, Notice, Pager, useDebounced, type Paged } from "./ui";

interface Row { id: string; slug: string; name: string; category: string; image: string; isVisible: boolean }
type List = Paged<Row> & { categories: string[] };

export default function ComponentsPage() {
  const [q, setQ] = useState(""); const dq = useDebounced(q);
  const [category, setCategory] = useState(""); const [visibility, setVisibility] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<List | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { setPage(1); }, [dq, category, visibility]);
  useEffect(() => {
    const qs = new URLSearchParams({ page: String(page), limit: "30" });
    if (dq) qs.set("q", dq); if (category) qs.set("category", category); if (visibility) qs.set("visibility", visibility);
    let stale = false;
    api<List>(`/admin/components?${qs}`).then((r) => { if (!stale) { setData(r); setError(""); } }).catch((e: ApiError) => { if (!stale) setError(e.message); });
    return () => { stale = true; };
  }, [page, dq, category, visibility]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Components</h1>
      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <input className="input" type="search" placeholder="Search components" aria-label="Search components" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{data?.categories.map((c) => <option key={c}>{c}</option>)}</select>
          <select className="input" aria-label="Filter by visibility" value={visibility} onChange={(e) => setVisibility(e.target.value)}><option value="">Visible and hidden</option><option value="visible">Visible</option><option value="hidden">Hidden</option></select>
        </div>
        {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
        {data && data.total === 0 && !error && <div className="mt-4"><Notice>No components found. If this is a new database, run <code>npm run seed:components</code> once to load the 30 learning components.</Notice></div>}
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((c) => (
            <li key={c.id}>
              <Link to={`/admin/components/${c.slug}`} className="card-hover flex h-full items-center gap-3 rounded-lg border border-line bg-white p-3">
                <img src={c.image} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-md bg-surface object-contain" />
                <span className="min-w-0"><span className="block truncate font-semibold">{c.name}</span><span className="block text-xs text-ink-faint">{c.category}{!c.isVisible && " · Hidden"}</span></span>
              </Link>
            </li>
          ))}
        </ul>
        {!data && !error && <p className="py-6 text-ink-soft" role="status">Loading…</p>}
        {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />}
      </Card>
    </div>
  );
}
