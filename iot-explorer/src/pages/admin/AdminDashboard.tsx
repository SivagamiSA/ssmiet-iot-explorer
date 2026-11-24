import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { adminRoleLabel } from "../../lib/permissions";

interface Dash {
  students?: { total: number; active: number };
  projects?: { total: number; approved: number; pending: number };
  events?: { total: number; published: number; draft: number };
  admins?: { total: number; active: number; superAdmins: number };
  recentActivity?: { id: string; action: string; actorEmail: string; summary: string; createdAt: string }[];
}

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "");

/** Phase 1 dashboard shell: read-only counts, shown only for the modules this admin may view. */
export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Dash>("/admin/dashboard").then(setData).catch((e) => setError(e instanceof ApiError ? e.message : "Could not load the dashboard."));
  }, []);

  const cards: { title: string; value: number; lines: string[] }[] = [];
  if (data?.students) cards.push({ title: "Students", value: data.students.total, lines: [`${data.students.active} active`] });
  if (data?.projects) cards.push({ title: "Projects", value: data.projects.total, lines: [`${data.projects.approved} approved`, `${data.projects.pending} pending`] });
  if (data?.events) cards.push({ title: "Events", value: data.events.total, lines: [`${data.events.published} published`, `${data.events.draft} draft`] });
  if (data?.admins) cards.push({ title: "Admins", value: data.admins.total, lines: [`${data.admins.active} active`, `${data.admins.superAdmins} Super Admin`] });

  return (
    <div className="space-y-6">
      <div className="fade-up rounded-lg border border-brand-100 bg-brand-50 p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{adminRoleLabel(user)}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Welcome, {user?.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">{user?.lastLoginAt ? `Last login: ${when(user.lastLoginAt)}` : "This is your first recorded login."}</p>
      </div>

      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {!data && !error && <p role="status" className="text-ink-soft">Loading…</p>}

      {data && cards.length === 0 && (
        <Panel title="No modules assigned yet">
          <p className="text-sm text-ink-soft">Your account does not have any permissions yet. Ask the Super Admin to grant you access to the modules you need.</p>
        </Panel>
      )}

      {cards.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <li key={c.title} className="rounded-lg bg-white p-5 shadow-card">
              <p className="text-sm font-semibold text-ink-soft">{c.title}</p>
              <p className="mt-1 font-display text-3xl font-bold">{c.value}</p>
              <p className="mt-1 text-sm text-ink-faint">{c.lines.join(" · ")}</p>
            </li>
          ))}
        </ul>
      )}

      {data?.recentActivity && (
        <Panel title="Recent admin activity">
          {data.recentActivity.length === 0 ? <p className="text-sm text-ink-soft">Nothing recorded yet.</p> : (
            <ul className="divide-y divide-line">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4">
                  <span className="w-44 shrink-0 text-xs text-ink-faint">{when(a.createdAt)}</span>
                  <span className="min-w-0 text-sm"><span className="font-semibold">{a.action}</span>{a.actorEmail && <span className="text-ink-soft"> · {a.actorEmail}</span>}{a.summary && <span className="text-ink-faint"> — {a.summary}</span>}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-lg bg-white p-5 shadow-card sm:p-6"><h2 className="mb-3 text-lg font-bold">{title}</h2>{children}</section>;
}
