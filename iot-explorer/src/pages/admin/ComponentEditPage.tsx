import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { can } from "../../lib/permissions";
import { Card, Notice } from "./ui";

interface Comp {
  slug: string; name: string; category: string; image: string; summary: string; tip: string; isVisible: boolean;
  uses: string[]; steps: string[]; pins: { name: string; note: string }[]; wire: { from: string; to: string; color: string }[];
}
const lines = (a: string[]) => a.join("\n");
const split = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const parts = (s: string, n: number) => split(s).map((l) => { const p = l.split("|").map((x) => x.trim()); return Array.from({ length: n }, (_, i) => p[i] ?? ""); });

export default function ComponentEditPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const canEdit = can(user, "components.manage");
  const [c, setC] = useState<Comp | null>(null);
  const [f, setF] = useState({ name: "", summary: "", tip: "", image: "", isVisible: true, uses: "", steps: "", pins: "", wire: "" });
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ component: Comp }>(`/admin/components/${slug}`).then(({ component: x }) => {
      setC(x);
      setF({ name: x.name, summary: x.summary, tip: x.tip, image: x.image, isVisible: x.isVisible, uses: lines(x.uses), steps: lines(x.steps),
        pins: x.pins.map((p) => `${p.name} | ${p.note}`).join("\n"), wire: x.wire.map((w) => `${w.from} | ${w.to} | ${w.color}`).join("\n") });
    }).catch((e: ApiError) => setMsg({ tone: "error", text: e.message }));
  }, [slug]);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      await api(`/admin/components/${slug}`, { method: "PATCH", body: {
        name: f.name, summary: f.summary, tip: f.tip, image: f.image, isVisible: f.isVisible, uses: split(f.uses), steps: split(f.steps),
        pins: parts(f.pins, 2).map(([name, note]) => ({ name, note })), wire: parts(f.wire, 3).map(([from, to, color]) => ({ from, to, color })),
      } });
      setMsg({ tone: "ok", text: "Component saved." });
    } catch (err) { setMsg({ tone: "error", text: err instanceof ApiError ? (Object.values(err.fields ?? {})[0] ?? err.message) : "Could not save." }); }
    finally { setBusy(false); }
  };

  if (!c) return msg ? <Notice tone="error">{msg.text}</Notice> : <p className="text-ink-soft" role="status">Loading…</p>;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const area = (k: "uses" | "steps" | "pins" | "wire", label: string, hint: string, rows = 4) => (
    <div className="sm:col-span-2"><label className="field-label" htmlFor={k}>{label}</label>
      <textarea id={k} className="input" rows={rows} value={f[k]} onChange={set(k)} disabled={!canEdit} /><p className="mt-1 text-xs text-ink-faint">{hint}</p></div>
  );
  return (
    <div className="space-y-6">
      <Link to="/admin/components" className="text-sm font-medium text-brand-600 hover:underline">← Back to components</Link>
      <div className="flex items-center gap-4"><img src={f.image} alt="" className="h-16 w-16 rounded-md bg-white object-contain shadow-card" /><div><h1 className="text-2xl font-bold">{c.name}</h1><p className="text-sm text-ink-soft">{c.category} · {c.slug}</p></div></div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {!canEdit && <Notice>You can view this component but not change it.</Notice>}
      <Card>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div><label className="field-label" htmlFor="name">Name</label><input id="name" className="input" required maxLength={120} value={f.name} onChange={set("name")} disabled={!canEdit} /></div>
          <div><label className="field-label" htmlFor="image">Image path</label><input id="image" className="input" maxLength={200} value={f.image} onChange={set("image")} disabled={!canEdit} /></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="summary">Summary</label><textarea id="summary" className="input" rows={2} maxLength={400} value={f.summary} onChange={set("summary")} disabled={!canEdit} /></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="tip">Tip</label><textarea id="tip" className="input" rows={2} maxLength={400} value={f.tip} onChange={set("tip")} disabled={!canEdit} /></div>
          {area("uses", "Common uses", "One per line.")}
          {area("steps", "How it works (steps)", "One step per line, in order.", 5)}
          {area("pins", "Pins", "One per line: pin name | what it does", 5)}
          {area("wire", "Wiring", "One per line: component pin | Arduino pin | wire colour (hex)", 4)}
          <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.isVisible} disabled={!canEdit} onChange={(e) => setF({ ...f, isVisible: e.target.checked })} /> Visible to students</label>
          {canEdit && <div className="sm:col-span-2"><button className="btn-primary" disabled={busy}>Save changes</button></div>}
        </form>
      </Card>
    </div>
  );
}
