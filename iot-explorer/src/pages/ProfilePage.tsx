import { Link, useNavigate } from "react-router-dom";
import { dashboardFor, useAuth } from "../lib/auth";

/** My Profile: shows the details saved with the logged-in account (student or admin). */
export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const rows: [string, string | number | undefined][] = [
    ["Name", user.name],
    ["Email", user.email],
    ["Role", user.role === "admin" ? "Admin" : "Student"],
    ...(user.role === "student" ? ([["School", user.schoolName], ["Standard", user.standard]] as [string, string | number | undefined][]) : []),
  ];

  return (
    <section className="bg-surface px-4 py-8 sm:px-8 sm:py-14">
      <div className="auth-card fade-up max-w-lg">
        <div className="flex items-center gap-4">
          <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-500 font-display text-2xl font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">My Profile</h1>
            <p className="truncate text-sm text-ink-soft">{user.name}</p>
          </div>
        </div>
        <dl className="mt-6 divide-y divide-line">
          {rows.filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:gap-4">
              <dt className="w-28 shrink-0 text-sm text-ink-soft">{k}</dt>
              <dd className="min-w-0 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to={dashboardFor(user.role)} className="btn-primary w-full sm:w-auto">Go to Dashboard</Link>
          <button type="button" className="btn-outline w-full sm:w-auto" onClick={() => { logout(); navigate("/", { replace: true }); }}>Log out</button>
        </div>
      </div>
    </section>
  );
}
