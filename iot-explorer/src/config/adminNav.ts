// Admin portal menu. ready:false = built in a later phase; the item shows a notice instead of a broken page.
// `permission` hides the item from admins who may not use it; `superOnly` hides it from everyone but the Super Admin.
export interface AdminNavItem { label: string; href: string; ready: boolean; notice?: string; permission?: string; superOnly?: boolean }

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", ready: true },
  { label: "Students", href: "/admin/students", ready: true, permission: "students.view", notice: "Student management arrives in Phase 2." },
  { label: "Schools", href: "/admin/schools", ready: true, permission: "schools.view", notice: "School management arrives in Phase 2." },
  { label: "Components", href: "/admin/components", ready: true, permission: "components.view", notice: "Component management arrives in Phase 3." },
  { label: "Projects", href: "/admin/projects", ready: true, permission: "projects.view", notice: "Project management arrives in Phase 3." },
  { label: "Events", href: "/admin/events", ready: false, permission: "events.view", notice: "Event management arrives in Phase 4." },
  { label: "Quizzes", href: "/admin/quizzes", ready: false, permission: "quizzes.view", notice: "Quiz management arrives in Phase 4." },
  { label: "Simulations", href: "/admin/simulations", ready: false, permission: "simulations.view", notice: "Simulation monitoring arrives in Phase 5." },
  { label: "Reports", href: "/admin/reports", ready: true, permission: "reports.view", notice: "Reports and analytics arrive in Phase 5." },
  { label: "Automation", href: "/admin/automation", ready: false, permission: "automation.view", notice: "Hybrid automation arrives in Phase 7." },
  { label: "Audit Log", href: "/admin/audit", ready: true, permission: "audit.view", notice: "The audit log viewer arrives in Phase 2. Entries are already being recorded." },
  { label: "Admin Accounts", href: "/admin/admins", ready: true, superOnly: true, notice: "Admin account management arrives in Phase 2." },
  { label: "Security & Settings", href: "/admin/security", ready: true },
];
