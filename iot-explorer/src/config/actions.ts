/**
 * Navigation actions.
 * ready: true  -> real link (works now). Paths starting with "/" use the router, "#..." scroll the landing page.
 * ready: false -> not built yet; the button shows a notice instead of faking behaviour.
 */
export interface Action { href: string; ready: boolean; notice?: string }

export const ACTIONS = {
  login: { href: "/login", ready: true }, // the one login page (Student / Admin switch)
  startLearning: { href: "/login", ready: true }, // Start Learning opens the same login page
} satisfies Record<string, Action>;
