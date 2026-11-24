import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Card, Notice, StatusBadge, fmtDate } from "./ui";

interface Acc { id: string; name: string; email: string; adminRole: "super_admin" | "admin"; permissions: string[]; isActive: boolean; lastLoginAt: string | null }
interface Resp { items: Acc[]; modules: Record<string, string[]> }

export default function AdminAccountsPage() {
  const { user } = useAuth();
  const [d, setD] = useState<Resp | null>(null);
  const [open, setOpen] = useState<Acc | null>(null);
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api<Resp>("/admin/admin-accounts").then(setD).catch((e: ApiError) => setMsg({ tone: "error", text: e.message })), []);
  useEffect(() => { load(); }, [load]);

  const patch = async (a: Acc, body: Record<string, unknown>, ok: string) => {
    setBusy(true); setMsg(null);
    try { await api(`/admin/admin-accounts/${a.id}`, { method: "PATCH", body }); setMsg({ tone: "ok", text: ok }); setOpen(null); await load(); }
    catch (e) { setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "Could not save." }); }
    finally { setBusy(false); }
  };
  const edit = (a: Acc) => { setOpen(a); setPerms(new Set(a.permissions)); setMsg(null); };
  const toggle = (p: string) => setPerms((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); return n; });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Accounts</h1>
      <Notice>New admin accounts are created from the terminal with <code>npm run create-admin</code>. Here you manage who can do what.</Notice>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      {open && d && (
        <Card title={`Permissions for ${open.name}`}>
          {open.adminRole === "super_admin" ? <p className="text-sm text-ink-soft">A Super Admin always has every permission.</p> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(d.modules).map(([m, actions]) => (
                <fieldset key={m} className="rounded-md border border-line p-3"><legend className="px-1 text-sm font-semibold capitalize">{m}</legend>
                  {actions.map((a) => { const p = `${m}.${a}`; return <label key={p} className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" checked={perms.has(p)} onChange={() => toggle(p)} /> {a}</label>; })}
                </fieldset>))}
            </div>)}
          <p className="mt-3 text-xs text-ink-faint">“manage” includes “view”. Simulations, events, quizzes and automation permissions are saved now and take effect when those modules are built.</p>
          <div className="mt-4 flex gap-2">
            {open.adminRole !== "super_admin" && <button type="button" className="btn-primary" disabled={busy} onClick={() => patch(open, { permissions: [...perms] }, "Permissions saved.")}>Save permissions</button>}
            <button type="button" className="btn-outline" onClick={() => setOpen(null)}>Close</button>
          </div>
        </Card>
      )}

      <Card>
        <div className="scroll-x">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-ink-soft"><tr><th className="py-2 pr-3">Admin</th><th className="pr-3">Role</th><th className="pr-3">Status</th><th className="pr-3">Last login</th><th /></tr></thead>
            <tbody>{d?.items.map((a) => {
              const me = a.id === user?.id;
              return (
                <tr key={a.id} className="border-b border-line/60">
                  <td className="py-3 pr-3"><span className="font-medium">{a.name}{me && " (you)"}</span><br /><span className="text-ink-faint">{a.email}</span></td>
                  <td className="pr-3">{a.adminRole === "super_admin" ? "Super Admin" : "Admin"}</td>
                  <td className="pr-3"><StatusBadge active={a.isActive} /></td><td className="pr-3">{fmtDate(a.lastLoginAt)}</td>
                  <td className="space-x-3 whitespace-nowrap text-right">
                    <button type="button" className="font-medium text-brand-600 hover:underline" onClick={() => edit(a)}>Permissions</button>
                    {!me && <button type="button" className="font-medium text-ink-soft hover:underline" disabled={busy} onClick={() => patch(a, { adminRole: a.adminRole === "super_admin" ? "admin" : "super_admin" }, "Role updated.")}>{a.adminRole === "super_admin" ? "Make Admin" : "Make Super Admin"}</button>}
                    {!me && <button type="button" className="font-medium text-ink-soft hover:underline" disabled={busy} onClick={() => { if (a.isActive && !window.confirm(`Deactivate ${a.email}? They will not be able to log in.`)) return; patch(a, { isActive: !a.isActive }, a.isActive ? "Account deactivated." : "Account activated."); }}>{a.isActive ? "Deactivate" : "Activate"}</button>}
                  </td>
                </tr>);
            })}</tbody>
          </table>
          {!d && <p className="py-6 text-ink-soft" role="status">Loading…</p>}
        </div>
      </Card>
    </div>
  );
}
