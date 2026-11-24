import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { Card, Notice, Pager } from "./ui";

interface Item { id: string; action: string; actorEmail: string; actorRole: string; targetType: string; summary: string; createdAt: string }
interface Page { page: number; limit: number; total: number; items: Item[] }

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [d, setD] = useState<Page | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<Page>(`/admin/audit-log?page=${page}&limit=25`).then(setD).catch((e: ApiError) => setError(e.message)); }, [page]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      {error && <Notice tone="error">{error}</Notice>}
      <Card>
        <div className="scroll-x">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-ink-soft"><tr><th className="py-2 pr-3">When</th><th className="pr-3">Action</th><th className="pr-3">Admin</th><th>Details</th></tr></thead>
            <tbody>{d?.items.map((a) => (
              <tr key={a.id} className="border-b border-line/60 align-top">
                <td className="whitespace-nowrap py-2 pr-3 text-ink-faint">{new Date(a.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="pr-3 font-medium">{a.action}</td><td className="pr-3">{a.actorEmail || "-"}</td><td className="text-ink-soft">{a.summary}</td>
              </tr>))}</tbody>
          </table>
          {d && d.items.length === 0 && <div className="mt-4"><Notice>Nothing recorded yet.</Notice></div>}
          {!d && !error && <p className="py-6 text-ink-soft" role="status">Loading…</p>}
        </div>
        {d && <Pager page={d.page} pages={Math.max(1, Math.ceil(d.total / d.limit))} total={d.total} onPage={setPage} />}
      </Card>
    </div>
  );
}
