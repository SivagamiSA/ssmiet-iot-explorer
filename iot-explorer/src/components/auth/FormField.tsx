import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string; hint?: string }

export function FormField({ label, error, hint, ...input }: Props) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <input id={id} className="input" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...input} />
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-faint">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function SelectField({ label, error, children, ...select }: { label: string; error?: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <select id={id} className="input" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...select}>{children}</select>
      {error && <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function PasswordField({ label, error, hint, ...input }: Props) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} className="input pr-14" aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...input} />
        <button
          type="button" onClick={() => setShow(!show)} aria-pressed={show}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-0 top-0 flex h-12 w-12 touch-manipulation items-center justify-center text-ink-soft hover:text-brand-600"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
            {show && <path d="M3 3l18 18" />}
          </svg>
        </button>
      </div>
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-faint">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function FormAlert({ kind, children }: { kind: "error" | "success"; children: ReactNode }) {
  const cls = kind === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800";
  return <div role={kind === "error" ? "alert" : "status"} className={`rounded-md border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}
