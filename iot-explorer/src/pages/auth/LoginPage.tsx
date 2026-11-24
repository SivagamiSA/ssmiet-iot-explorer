import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell";
import { FormAlert, FormField, PasswordField, SelectField } from "../../components/auth/FormField";
import { api, ApiError } from "../../lib/api";
import { homeFor, useAuth } from "../../lib/auth";
import { STANDARDS } from "../../config/site";

type Tab = "student" | "admin";
const EMAIL_RE = /^\S+@\S+\.\S+$/;

/** The one login page: a Student / Admin switch, and inside Student a Log in / Create account switch. */
export default function LoginPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "admin" ? "admin" : "student";
  const setTab = (t: Tab) => setParams(t === "admin" ? { tab: "admin" } : {}, { replace: true });

  return (
    <AuthShell
      title="Login"
      subtitle={tab === "admin" ? "For authorised teachers and coordinators only." : "Log in to continue learning IoT."}
    >
      <div role="tablist" aria-label="Login type" className="mb-6 grid grid-cols-2 gap-1 rounded-md border border-line bg-surface p-1">
        {(["student", "admin"] as const).map((t) => (
          <button
            key={t} type="button" role="tab" id={`tab-${t}`} aria-selected={tab === t} aria-controls="login-panel"
            onClick={() => setTab(t)}
            className={`min-h-12 touch-manipulation rounded font-semibold capitalize transition-colors ${tab === t ? "bg-brand-500 text-white shadow-sm" : "text-ink-soft hover:text-brand-600"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div id="login-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "student" ? <StudentPanel /> : <AdminPanel />}
      </div>
    </AuthShell>
  );
}

function useLoginSubmit(role: Tab) {
  const { login } = useAuth();
  const navigate = useNavigate();
  return async (credentials: Record<string, string>) => {
    const user = await login(role, credentials);
    navigate(homeFor(user.role), { replace: true });
  };
}

function showApiError(err: unknown, setFormError: (m: string) => void, setErrors: (e: Record<string, string>) => void) {
  if (err instanceof ApiError) { setFormError(err.message); setErrors(err.fields ?? {}); }
  else setFormError("Something went wrong. Please try again.");
}

/* ---------------- Student: log in OR create account ---------------- */
function StudentPanel() {
  const [mode, setMode] = useState<"login" | "create">("login");
  const [created, setCreated] = useState("");
  const [email, setEmail] = useState("");
  const switchTo = (m: "login" | "create") => { setMode(m); if (m === "create") setCreated(""); };

  return (
    <>
      {mode === "login"
        ? <StudentLoginForm email={email} setEmail={setEmail} notice={created} />
        : <CreateAccountForm onDone={(e) => { setEmail(e); setCreated("Account created. Please log in."); setMode("login"); }} />}
      <div className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-soft">
        {mode === "login" ? (
          <p>New student?{" "}
            <button type="button" onClick={() => switchTo("create")} className="inline-flex min-h-11 items-center font-semibold text-brand-600 underline underline-offset-4">Create Account</button>
          </p>
        ) : (
          <p>Already have an account?{" "}
            <button type="button" onClick={() => switchTo("login")} className="inline-flex min-h-11 items-center font-semibold text-brand-600 underline underline-offset-4">Log in</button>
          </p>
        )}
      </div>
    </>
  );
}

function StudentLoginForm({ email, setEmail, notice }: { email: string; setEmail: (v: string) => void; notice: string }) {
  const submit = useLoginSubmit("student");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fe: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) fe.email = "Enter a valid email address";
    if (!password) fe.password = "Enter your password";
    setErrors(fe); setFormError("");
    if (Object.keys(fe).length) return;
    setBusy(true);
    try { await submit({ email: email.trim(), password }); }
    catch (err) { showApiError(err, setFormError, setErrors); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {notice && <FormAlert kind="success">{notice}</FormAlert>}
      {formError && <FormAlert kind="error">{formError}</FormAlert>}
      <FormField label="Email" name="email" type="email" autoComplete="username" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      <PasswordField label="Password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
      <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Logging in…" : "Login"}</button>
    </form>
  );
}

const empty = { name: "", schoolName: "", standard: "", email: "", password: "", confirmPassword: "" };
type Form = typeof empty;

// Same rules as the server (the server always re-checks them).
function validate(f: Form) {
  const e: Record<string, string> = {};
  if (f.name.trim().length < 2) e.name = "Enter the student's name";
  if (f.schoolName.trim().length < 2) e.schoolName = "Enter your school name";
  if (!f.standard) e.standard = "Select your standard";
  if (!f.email.trim()) e.email = "Enter your email address";
  else if (!EMAIL_RE.test(f.email.trim())) e.email = "Enter a valid email address";
  if (!f.password) e.password = "Enter a password";
  else if (f.password.length < 8) e.password = "Password must be at least 8 characters";
  else if (!/[A-Za-z]/.test(f.password) || !/[0-9]/.test(f.password)) e.password = "Password must include a letter and a number";
  if (!f.confirmPassword) e.confirmPassword = "Confirm your password";
  else if (f.confirmPassword !== f.password) e.confirmPassword = "Passwords do not match";
  return e;
}

function CreateAccountForm({ onDone }: { onDone: (email: string) => void }) {
  const [f, setF] = useState<Form>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF((prev) => ({ ...prev, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fe = validate(f);
    setErrors(fe); setFormError("");
    if (Object.keys(fe).length) return;
    setBusy(true);
    try {
      await api("/auth/student/register", {
        body: { name: f.name.trim(), schoolName: f.schoolName.trim(), standard: Number(f.standard), email: f.email.trim(), password: f.password, confirmPassword: f.confirmPassword },
      });
      onDone(f.email.trim());
    } catch (err) { showApiError(err, setFormError, setErrors); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <h2 className="text-lg font-bold">Create your student account</h2>
      {formError && <FormAlert kind="error">{formError}</FormAlert>}
      <FormField label="Student Name" name="name" autoComplete="name" value={f.name} onChange={set("name")} error={errors.name} />
      <FormField label="School Name" name="schoolName" autoComplete="organization" value={f.schoolName} onChange={set("schoolName")} error={errors.schoolName} />
      <SelectField label="Standard" name="standard" value={f.standard} onChange={set("standard")} error={errors.standard}>
        <option value="">Select standard</option>
        {STANDARDS.map((s) => <option key={s} value={s}>{s}</option>)}
      </SelectField>
      <FormField label="Email ID" name="email" type="email" autoComplete="email" autoCapitalize="none" value={f.email} onChange={set("email")} error={errors.email} />
      <PasswordField label="Password" name="password" autoComplete="new-password" hint="At least 8 characters, with a letter and a number." value={f.password} onChange={set("password")} error={errors.password} />
      <PasswordField label="Confirm Password" name="confirmPassword" autoComplete="new-password" value={f.confirmPassword} onChange={set("confirmPassword")} error={errors.confirmPassword} />
      <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Creating account…" : "Create Account"}</button>
    </form>
  );
}

/* ---------------- Admin: log in only ---------------- */
function AdminPanel() {
  const submit = useLoginSubmit("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fe: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) fe.email = "Enter a valid email address";
    if (!password) fe.password = "Enter your password";
    setErrors(fe); setFormError("");
    if (Object.keys(fe).length) return;
    setBusy(true);
    try { await submit({ email: email.trim(), password }); }
    catch (err) { showApiError(err, setFormError, setErrors); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && <FormAlert kind="error">{formError}</FormAlert>}
      <FormField label="Email" name="email" type="email" autoComplete="username" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      <PasswordField label="Password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
      <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Logging in…" : "Login"}</button>
      <p className="text-center text-sm text-ink-faint">Admin accounts are created by the college. There is no public admin sign-up.</p>
    </form>
  );
}
