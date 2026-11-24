import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

// Temporary landing spots after login. Stage 3+ replaces these with the real dashboards.
function Placeholder({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <section className="bg-surface px-4 py-10 sm:px-8 sm:py-16">
      <div className="auth-card text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mt-3 text-ink-soft">Welcome, <strong className="text-ink">{user?.name}</strong>. You are logged in as {user?.role}.</p>
        <p className="mt-2 text-sm text-ink-faint">This dashboard will be built in a later stage.</p>
        <button type="button" className="btn-outline mt-6 w-full sm:w-auto" onClick={() => { logout(); navigate("/", { replace: true }); }}>Log out</button>
      </div>
    </section>
  );
}
export const StudentDashboardPlaceholder = () => <Placeholder title="Student Dashboard" />;
export const AdminDashboardPlaceholder = () => <Placeholder title="Admin Dashboard" />;
