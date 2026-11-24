// Student portal menu. ready:false = built in a later part; the item shows a notice instead of a broken page.
// Learning also covers the component explorer and progress status (they used to be separate pages).
export const STUDENT_NAV = [
 
  { label: "Learning", href: "/student/learning", also: ["/student/components"], ready: true },
  { label: "Projects & Simulation", href: "/student/projects", also: [], ready: true },
   { label: "Quizzes", href: "/student/quizzes", also: [], ready: true },
  { label: "Events", href: "/student/events", also: [], ready: false, notice: "no event has been launched" },
 
] as const;
