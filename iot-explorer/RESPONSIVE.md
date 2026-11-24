# Responsive rules (permanent, every stage)

Mobile first: write the phone layout with no prefix, then add `sm:` (640) `md:` (768) `lg:` (1024) for bigger screens.

## Every new page / component must
1. Fit 320px wide with **no sideways scroll** (page level). Use `min-w-0` on grid/flex children that hold long text.
2. Touch targets **at least 44x44px** (`h-11`/`min-h-11`); 12px+ gap between neighbouring targets.
3. Forms: use `.field-label`, `.input`, `.btn-primary`, `.btn-outline`, `.auth-card` from `src/index.css`.
   Inputs are 16px+ (stops iPhone zoom), one column on phones, full-width buttons on phones.
   Use `type="email"`, `inputMode`, `autoComplete` so phone keyboards help.
4. Tables: wrap in `<div className="scroll-x">`, or turn rows into stacked cards on phones (`hidden md:table` + card list).
5. Images/diagrams: `w-full h-auto` or an `aspect-*` box; SVG circuit diagrams use `viewBox` + `className="w-full h-auto"`.
6. Navigation: reuse `Navbar` (hamburger under 768px). Logged-in areas (student/admin) get the same hamburger pattern;
   sidebars become a slide-down menu or bottom tab bar on phones.
7. Keep the orange brand (`brand-*`), Bricolage Grotesque / Public Sans, and the existing card/section styling.

## Circuit simulator (future stage) must
- Canvas/SVG fills the screen width, height `min(70dvh, ...)`; component palette becomes a bottom sheet or horizontal scroller.
- Use **Pointer Events** (not mouse events) so touch, pen and mouse share one code path; set `touch-action: none` on the canvas only.
- Support pinch-zoom and two-finger pan on the canvas; provide +/- zoom and "fit to screen" buttons.
- Tap a component to select, tap a pin then another pin to wire (no hover or right-click required); 44px minimum hit areas for pins (invisible larger hit circle).
- Landscape-friendly; show a "rotate for a bigger workspace" hint on very small portrait screens, but never require rotation.

## Checking
```
npm run dev
python3 scripts/responsive-check.py http://localhost:5173 / /login /register /admin
```
Tests 320, 375, 390, 430, 768, 1024, 1280, 1536 and phone-landscape: overflow, touch size, input font size.
Also eyeball real devices / Chrome DevTools device toolbar before finishing each stage.

## Auth pages (Stage 2)
- Every login/register page uses `AuthShell` (`.auth-card`) and the `FormField` / `PasswordField` / `SelectField` components: 48px-tall inputs, 16px text, 48px show-password button.
- New forms must reuse these. Do not write one-off inputs.
- `npm run check:responsive` now audits `/` and `/login` (Student and Admin tabs).
