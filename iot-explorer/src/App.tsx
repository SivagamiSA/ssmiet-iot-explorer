import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import StageNotice from "./components/ui/StageNotice";
import { GuestOnly, RequireAuth, RequireRole } from "./components/auth/RouteGuards";
import { AuthProvider } from "./lib/auth";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import StudentDashboard from "./pages/student/StudentDashboard";
import LearningPage from "./pages/student/LearningPage";
import LessonPage from "./pages/student/LessonPage";
import ComponentDetailPage from "./pages/student/ComponentDetailPage";
import ProfilePage from "./pages/ProfilePage";
import StudentSimulationPage from "./simulation/StudentSimulationPage";
import QuizPage from "./quiz/QuizPage";
import FinalAssessmentPage from "./quiz/FinalAssessmentPage";
import AdminLayout from "./components/admin/AdminLayout";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StudentsPage from "./pages/admin/StudentsPage";
import StudentDetailPage from "./pages/admin/StudentDetailPage";
import SchoolsPage from "./pages/admin/SchoolsPage";
import ComponentsPage from "./pages/admin/ComponentsPage";
import ComponentEditPage from "./pages/admin/ComponentEditPage";
import ProjectsPage from "./pages/admin/ProjectsPage";
import ReportsPage from "./pages/admin/ReportsPage";
import AuditLogPage from "./pages/admin/AuditLogPage";
import AdminAccountsPage from "./pages/admin/AdminAccountsPage";
import SecurityPage from "./pages/admin/SecurityPage";
import { RequirePermission } from "./components/admin/RequirePermission";

/** New page = start at the top. Links with a #section are left to the browser. */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

/** Each new page fades in. The key restarts the animation only when the path changes. */
function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <div key={pathname} className="page-enter">{children}</div>;
}

/** The public/student site has the shared header and footer. The Admin Portal (/admin/*) is a separate shell with its own layout. */
function AppShell() {
  const { pathname } = useLocation();
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  return (
    <>
      <ScrollToTop />
      {!inAdmin && <Navbar />}
      <main>
        <PageTransition>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
            <Route path="/student/learning" element={<RequireRole role="student"><LearningPage /></RequireRole>} />
            <Route path="/student/learning/:id" element={<RequireRole role="student"><LessonPage /></RequireRole>} />
            <Route path="/student/components" element={<Navigate to="/student/learning" replace />} />
            <Route path="/student/components/:slug" element={<RequireRole role="student"><ComponentDetailPage /></RequireRole>} />
            <Route path="/student/projects/*" element={<RequireRole role="student"><StudentSimulationPage /></RequireRole>} />
            <Route path="/student/final-assessment" element={<RequireRole role="student"><FinalAssessmentPage /></RequireRole>} />
            <Route path="/student/quizzes" element={<RequireRole role="student"><QuizPage /></RequireRole>} />
            <Route path="/student/quizzes/:projectId" element={<RequireRole role="student"><QuizPage /></RequireRole>} />
            <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/student/dashboard" element={<RequireRole role="student"><StudentDashboard /></RequireRole>} />
            {/* Admin Portal */}
            <Route path="/admin/login" element={<GuestOnly><AdminLoginPage /></GuestOnly>} />
            <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="students" element={<RequirePermission permission="students.view"><StudentsPage /></RequirePermission>} />
              <Route path="students/:id" element={<RequirePermission permission="students.view"><StudentDetailPage /></RequirePermission>} />
              <Route path="schools" element={<RequirePermission permission="schools.view"><SchoolsPage /></RequirePermission>} />
              <Route path="components" element={<RequirePermission permission="components.view"><ComponentsPage /></RequirePermission>} />
              <Route path="components/:slug" element={<RequirePermission permission="components.view"><ComponentEditPage /></RequirePermission>} />
              <Route path="projects" element={<RequirePermission permission="projects.view"><ProjectsPage /></RequirePermission>} />
              <Route path="reports" element={<RequirePermission permission="reports.view"><ReportsPage /></RequirePermission>} />
              <Route path="audit" element={<RequirePermission permission="audit.view"><AuditLogPage /></RequirePermission>} />
              <Route path="admins" element={<RequirePermission superOnly><AdminAccountsPage /></RequirePermission>} />
              <Route path="security" element={<SecurityPage />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
            {/* Old Stage 2 addresses keep working */}
            <Route path="/student/login" element={<Navigate to="/login" replace />} />
            <Route path="/student/register" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageTransition>
      </main>
      {!inAdmin && <Footer />}
      <StageNotice />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
