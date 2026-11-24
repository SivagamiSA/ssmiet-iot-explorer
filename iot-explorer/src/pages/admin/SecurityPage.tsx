import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { isSuperAdmin } from "../../lib/permissions";
import { PasswordField } from "../../components/auth/FormField";
import { Card, Notice } from "./ui";

export default function SecurityPage() {
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user);
  const [f, setF] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [pwMsg, setPwMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<boolean | null>(null);
  const [setMsg, setSetMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => { if (superAdmin) api<{ settings: { registrationOpen: boolean } }>("/admin/settings").then((r) => setOpen(r.settings.registrationOpen)).catch((e: ApiError) => setSetMsg({ tone: "error", text: e.message })); }, [superAdmin]);

  const changePassword = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErrs({}); setPwMsg(null);
    try { await api("/admin/me/password", { body: f }); setF({ currentPassword: "", newPassword: "", confirmPassword: "" }); setPwMsg({ tone: "ok", text: "Password changed." }); }
    catch (err) { if (err instanceof ApiError) { setErrs(err.fields ?? {}); if (!err.fields) setPwMsg({ tone: "error", text: err.message }); } }
    finally { setBusy(false); }
  };
  const toggleReg = async () => {
    setSetMsg(null);
    try { const r = await api<{ settings: { registrationOpen: boolean } }>("/admin/settings", { method: "PATCH", body: { registrationOpen: !open } }); setOpen(r.settings.registrationOpen); setSetMsg({ tone: "ok", text: "Setting saved." }); }
    catch (e) { setSetMsg({ tone: "error", text: e instanceof ApiError ? e.message : "Could not save." }); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Security &amp; Settings</h1>
      <Card title="Change your password">
        {pwMsg && <div className="mb-3"><Notice tone={pwMsg.tone}>{pwMsg.text}</Notice></div>}
        <form onSubmit={changePassword} className="grid max-w-xl gap-3">
          <PasswordField label="Current password" autoComplete="current-password" value={f.currentPassword} error={errs.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} />
          <PasswordField label="New password" autoComplete="new-password" hint="At least 8 characters, with a letter and a number." value={f.newPassword} error={errs.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} />
          <PasswordField label="Confirm new password" autoComplete="new-password" value={f.confirmPassword} error={errs.confirmPassword} onChange={(e) => setF({ ...f, confirmPassword: e.target.value })} />
          <div><button className="btn-primary" disabled={busy}>Change password</button></div>
        </form>
      </Card>

      {superAdmin && (
        <Card title="Platform settings">
          {setMsg && <div className="mb-3"><Notice tone={setMsg.tone}>{setMsg.text}</Notice></div>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-medium">Student registration</p><p className="text-sm text-ink-soft">{open === null ? "Loading…" : open ? "Open: new students can create accounts." : "Paused: new sign-ups are refused. Existing students can still log in."}</p></div>
            <button type="button" className="btn-outline" disabled={open === null} onClick={toggleReg}>{open ? "Pause registration" : "Open registration"}</button>
          </div>
        </Card>
      )}
    </div>
  );
}
