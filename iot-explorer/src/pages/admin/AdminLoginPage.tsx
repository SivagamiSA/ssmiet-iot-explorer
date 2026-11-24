import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../../components/ui/Logo";
import { FormAlert, FormField, PasswordField } from "../../components/auth/FormField";
import { ApiError } from "../../lib/api";
import { homeFor, useAuth } from "../../lib/auth";
import { SITE } from "../../config/site";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/** Separate admin sign-in at /admin/login. It uses the existing admin login API; there is no admin sign-up. */
export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
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
    try {
      const user = await login("admin", { email: email.trim(), password });
      navigate(homeFor(user.role), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) { setFormError(err.message); setErrors(err.fields ?? {}); }
      else setFormError("Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <section className="grid min-h-[100dvh] place-items-center bg-surface px-4 py-10">
      <div className="auth-card">
        <div className="flex items-center gap-3">
          <Logo className="h-12 w-auto shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-lg font-semibold">{SITE.name}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Admin Portal</p>
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-bold sm:text-3xl">Admin login</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">For authorised teachers and coordinators only.</p>
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
          {formError && <FormAlert kind="error">{formError}</FormAlert>}
          <FormField label="Email" name="email" type="email" autoComplete="username" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
          <PasswordField label="Password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
          <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Logging in…" : "Login"}</button>
        </form>
        <p className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-soft">
          Admin accounts are created by the college. Are you a student?{" "}
          <Link to="/login" className="inline-flex min-h-11 items-center font-semibold text-brand-600 underline underline-offset-4">Student login</Link>
        </p>
      </div>
    </section>
  );
}
