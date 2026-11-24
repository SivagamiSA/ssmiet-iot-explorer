import { useEffect, useMemo, useRef, useState } from "react";
import type { Learn } from "./data";

/* ---------- progress (stored in this browser only; no backend changes) ---------- */
export interface Prog { stages: number[]; quiz?: number }
const KEY = "iotx-learn-progress";
export const loadProg = (): Record<string, Prog> => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };
export const saveProg = (all: Record<string, Prog>) => { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage blocked: progress just won't persist */ } };
export const STAGES = ["Basics", "Pins", "How it works"] as const;
export const isDone = (p?: Prog) => !!p && p.stages.length >= STAGES.length;

/* ---------- 3D-style viewer: image layers with depth, drag to rotate, slider to zoom ---------- */
export function Viewer3D({ c }: { c: Learn }) {
  const [rot, setRot] = useState({ x: -12, y: 24 }); const [zoom, setZoom] = useState(1); const [auto, setAuto] = useState(true);
  const drag = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { if (!auto) return; const t = setInterval(() => setRot((r) => ({ ...r, y: r.y + 1.2 })), 30); return () => clearInterval(t); }, [auto]);
  const layers = [0, 1, 2, 3, 4, 5];
  return (
    <div>
      <div className="relative mx-auto h-72 max-w-md touch-none select-none overflow-hidden rounded-lg bg-gradient-to-br from-brand-50 to-white sm:h-96" style={{ perspective: 900, cursor: "grab" }}
        onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; setAuto(false); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
        onPointerMove={(e) => { if (!drag.current) return; const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y; drag.current = { x: e.clientX, y: e.clientY }; setRot((r) => ({ x: Math.max(-70, Math.min(70, r.x - dy * 0.6)), y: r.y + dx * 0.6 })); }}
        onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}
        onWheel={(e) => setZoom((z) => Math.max(0.6, Math.min(2, z - e.deltaY * 0.001)))}>
        <div className="absolute inset-0 m-auto h-56 w-56 sm:h-72 sm:w-72" style={{ transformStyle: "preserve-3d", transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg) scale(${zoom})` }}>
          {layers.map((i) => <img key={i} src={c.img} alt={i === 5 ? c.name : ""} draggable={false} className="absolute inset-0 h-full w-full object-contain" style={{ transform: `translateZ(${(i - 2.5) * 5}px)`, filter: i < 5 ? `brightness(${0.55 + i * 0.08})` : undefined }} />)}
        </div>
      </div>
      <div className="mx-auto mt-3 flex max-w-md flex-wrap items-center gap-3">
        <button type="button" className="btn-outline" onClick={() => setAuto((a) => !a)}>{auto ? "Pause spin" : "Auto-rotate"}</button>
        <button type="button" className="btn-outline" onClick={() => { setRot({ x: -12, y: 24 }); setZoom(1); }}>Reset</button>
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">Zoom<input aria-label="Zoom" type="range" min={0.6} max={2} step={0.05} value={zoom} onChange={(e) => setZoom(+e.target.value)} className="w-full accent-brand-500" /></label>
      </div>
      <p className="mx-auto mt-3 max-w-md text-center text-xs text-ink-faint">3D-style view built from the component image (no real 3D model was supplied). Drag to rotate, scroll or use the slider to zoom.</p>
    </div>
  );
}

/* ---------- animated working-principle scene ---------- */
export function Scene({ c, step }: { c: Learn; step: number }) {
  const k = c.kind;
  return (
    <svg viewBox="0 0 600 240" role="img" aria-label={`Animated working of ${c.name}, step ${step + 1}`} className="w-full rounded-lg bg-surface">
      <rect x="14" y="80" width="110" height="80" rx="8" fill="#fff" stroke="#e2e5ea" /><text x="69" y="126" textAnchor="middle" fontSize="14" fontWeight="700" fill="#18212d">Arduino</text>
      <image href={c.img} x="250" y="60" width="110" height="110" preserveAspectRatio="xMidYMid meet" />
      {(k === "flow" || k === "dial" || k === "glow") && <>
        <path d="M124 120 H250" stroke="#e8590c" strokeWidth="4" fill="none" className="dash-flow" />
        <path d="M360 120 H470" stroke="#e8590c" strokeWidth="4" fill="none" className="dash-flow" style={{ opacity: step > 0 ? 1 : 0.2 }} />
      </>}
      {k === "dial" && <g transform="translate(520 150)"><circle r="42" fill="#fff" stroke="#e2e5ea" /><g className="sweep"><rect x="-3" y="-40" width="6" height="40" fill="#e8590c" rx="3" /></g><text y="62" textAnchor="middle" fontSize="12" fill="#4a5565">angle / value changes</text></g>}
      {k === "glow" && <g transform="translate(520 120)"><circle r="34" fill="#fbbf24" className="glow-pulse" /><circle r="14" fill="#f59e0b" /><text y="64" textAnchor="middle" fontSize="12" fill="#4a5565">light / sound / switch ON</text></g>}
      {k === "flow" && <g transform="translate(520 120)"><rect x="-44" y="-30" width="88" height="60" rx="8" fill="#fff4ec" stroke="#e8590c" /><text textAnchor="middle" y="5" fontSize="13" fontWeight="600" fill="#a63b04">Reading</text><circle r="5" cx="-60" fill="#e8590c"><animate attributeName="cx" values="-90;-50" dur="1s" repeatCount="indefinite" /></circle></g>}
      {(k === "wave" || k === "radio") && <>
        <g transform="translate(360 120)">{[0, 0.6, 1.2].map((d) => <circle key={d} r="110" fill="none" stroke="#e8590c" strokeWidth="3" className="ring" style={{ ["--d" as string]: `${d}s` }} />)}</g>
        <rect x="500" y="70" width="40" height="100" rx={k === "radio" ? 10 : 2} fill="#fff" stroke="#18212d" strokeWidth="2" />
        <text x="520" y="196" textAnchor="middle" fontSize="12" fill="#4a5565">{k === "wave" ? "object" : "receiver"}</text>
        <path d="M124 120 H250" stroke="#e8590c" strokeWidth="4" fill="none" className="dash-flow" />
      </>}
      <text x="300" y="228" textAnchor="middle" fontSize="13" fontWeight="600" fill="#a63b04">Step {step + 1}: {c.steps[step]}</text>
    </svg>
  );
}

/* ---------- animated Arduino wiring ---------- */
const TOP = ["D13", "D12", "D11", "D10", "D9", "D8", "D7", "D6", "D5", "D4", "D3", "D2"], BOT = ["A0", "A1", "A2", "A3", "A4", "A5", "VIN", "GND", "5V", "3V3"];
const pinXY = (n: string) => { const t = TOP.indexOf(n), b = BOT.indexOf(n); if (t >= 0) return { x: 250 + t * 26, y: 70 }; if (b >= 0) return { x: 250 + b * 30, y: 190 }; if (n === "USB") return { x: 232, y: 130 }; return null; };
export function Wiring({ c, runKey }: { c: Learn; runKey: number }) {
  const h = Math.max(260, c.wire.length * 34 + 60);
  return (
    <div className="scroll-x"><svg key={runKey} viewBox={`0 0 640 ${h}`} role="img" aria-label={`Wiring ${c.name} to Arduino`} className="min-w-[560px] w-full rounded-lg bg-surface">
      <rect x="232" y="70" width="372" height="120" rx="10" fill="#1d4ed8" opacity=".9" /><text x="418" y="136" textAnchor="middle" fill="#fff" fontWeight="700" fontSize="18">ARDUINO UNO</text>
      {TOP.map((n, i) => <text key={n} x={250 + i * 26} y="92" textAnchor="middle" fontSize="9" fill="#fff">{n}</text>)}
      {BOT.map((n, i) => <text key={n} x={250 + i * 30} y="178" textAnchor="middle" fontSize="9" fill="#fff">{n}</text>)}
      {c.wire.map(([cp, ap, col], i) => {
        const y0 = 40 + i * 34, pos = pinXY(ap), x1 = pos ? pos.x : 232, y1 = pos ? (pos.y === 70 ? 62 : 198) : 130, d = pos ? `M120 ${y0} C 200 ${y0}, ${x1} ${y0 < y1 ? y1 - 60 : y1 + 60}, ${x1} ${y1}` : `M120 ${y0} H220`;
        return <g key={cp + i}><rect x="14" y={y0 - 13} width="106" height="26" rx="6" fill="#fff" stroke={col} strokeWidth="2" /><text x="67" y={y0 + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="#18212d">{cp}</text>
          <path d={d} fill="none" stroke={col} strokeWidth="4" strokeLinecap="round" className="wire-draw" style={{ ["--len" as string]: 700, ["--d" as string]: `${i * 0.25}s` }} />
          {!pos && <text x="226" y={y0 + 4} fontSize="11" fill="#4a5565">→ {ap}</text>}
          {pos && <circle cx={x1} cy={y1} r="5" fill={col} stroke="#fff" className="glow-pulse" />}</g>;
      })}
    </svg></div>
  );
}

/* ---------- pin identification ---------- */
export function Pins({ c, onSel }: { c: Learn; onSel?: () => void }) {
  const [sel, setSel] = useState(0);
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="relative mx-auto flex h-60 w-full max-w-sm items-center justify-center rounded-lg bg-brand-50"><img src={c.img} alt={c.name} className="h-52 w-52 object-contain" />
        <span className="absolute left-3 top-3 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">Pin {sel + 1} of {c.pins.length}</span></div>
      <div className="min-w-0">
        <div role="group" aria-label="Pins" className="flex flex-wrap gap-2">{c.pins.map(([n], i) => <button key={n} type="button" aria-pressed={sel === i} onClick={() => { setSel(i); onSel?.(); }} className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${sel === i ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white hover:border-brand-500"}`}>{n}</button>)}</div>
        <div className="mt-4 rounded-md border border-brand-100 bg-brand-50 p-4" aria-live="polite"><p className="font-display text-lg font-bold">{c.pins[sel][0]}</p><p className="mt-1 text-ink-soft">{c.pins[sel][1]}</p></div>
      </div>
    </div>
  );
}

/* ---------- mini quiz (component questions + a pin-identification question) ---------- */
export function Quiz({ c, onDone }: { c: Learn; onDone: (score: number, total: number) => void }) {
  const qs = useMemo(() => {
    const out = [...c.quiz];
    if (c.pins.length > 1) { const i = 0; const opts = c.pins.map(([n]) => n).slice(0, 4); out.push([`Which pin does this? "${c.pins[i][1]}"`, opts, i]); }
    return out;
  }, [c]);
  const [ans, setAns] = useState<(number | null)[]>(() => qs.map(() => null));
  useEffect(() => setAns(qs.map(() => null)), [qs]);
  const done = ans.every((a) => a !== null); const score = ans.filter((a, i) => a === qs[i][2]).length;
  useEffect(() => { if (done) onDone(score, qs.length); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [done]);
  return (
    <div className="space-y-5">
      {qs.map(([q, opts, right], qi) => (
        <fieldset key={q} className="min-w-0"><legend className="font-semibold">{qi + 1}. {q}</legend>
          <div className="mt-2 grid gap-2">{opts.map((o, oi) => { const picked = ans[qi] === oi, show = ans[qi] !== null;
            return <button key={o} type="button" disabled={show} onClick={() => setAns((a) => a.map((x, i) => (i === qi ? oi : x)))}
              className={`min-h-11 rounded-md border px-4 py-2 text-left text-sm ${show && oi === right ? "border-green-600 bg-green-50" : picked ? "border-red-500 bg-red-50" : "border-line bg-white hover:border-brand-500"}`}>{o}{show && oi === right ? " ✓" : picked ? " ✗" : ""}</button>; })}</div></fieldset>
      ))}
      {done && <p className="rounded-md bg-brand-50 p-4 font-semibold" role="status">You scored {score} / {qs.length}. {score === qs.length ? "Perfect!" : "Replay the lesson and try again."}</p>}
      {done && <button type="button" className="btn-outline" onClick={() => setAns(qs.map(() => null))}>Retry quiz</button>}
    </div>
  );
}
