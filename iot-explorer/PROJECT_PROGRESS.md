# PROJECT_PROGRESS

## Base
Built on `iot-explorer-admin-phase1` (Phase 1 complete: Super Admin / Admin roles, permissions, audit log model, admin layout, dashboard). Phase 1 was not rebuilt.

## Deferred (NOT touched): simulation automation/management, quizzes, certificates, events.
Data stays compatible for the future workflow (circuit/document file + Arduino code + connection image -> generated simulation shown in Student Dashboard): `projects`, `studentprogress.simulations` and `quizResults` were not changed; components keep `kind`, `pins`, `wire`, `steps` for it.

## Phase 2 - Student & School Management  (code written, merged into the Phase 1 copy, NOT run against MongoDB)
- Routes `server/src/routes/admin/people.js` use Phase 1 permissions: students.view/manage, schools.view/manage; changes are written to the audit log.
- New `schools` collection (`models/School.js`); `schoolId` added to Student (`schoolName` kept). Registration links to an existing school by name (`routes/auth.js`).
- Pages: Students, Student detail (progress), Schools. Migration: `npm run migrate:schools` (dry run) / `--apply` (JSON backup first).

## Phase 3 - Components
- New `components` collection filled ONCE from `src/learn/data.ts` (the 30 components): `npm run seed:components` (Node 22.18+; never overwrites admin edits).
- API `/api/admin/components` (list/filter, get, patch; no create/delete). Pages: Components, Component edit. Quiz questions are not copied.
- NOT yet connected: the student Learning/Explorer pages still read `src/learn/data.ts`, so admin edits and "hidden" do not change what students see until that is wired (needs a small student-side change, approval required).

## Phase 4 - Projects
- Uses the existing `projects` collection. API `/api/admin/projects` (list/filter, get, create, patch; slug fixed; no delete; hide = status "pending").
- Page: Projects (edit, approve/hide, student simulation activity read from `studentprogress`).
- Seed script still has 5 projects; the "18 verified projects" must already be in Atlas. Check with `npm run db:counts`.

## Phase 8 - Reports & Analytics
- `/api/admin/reports/overview` (reports.view) and `/reports/students.csv` (reports.manage, audit-logged, formula-safe). Page: Reports (bars from real records only).

## Phase 9 - Admin Security & Platform Settings
- Super Admin: Admin Accounts (permissions, role, activate/deactivate; cannot lock out the last Super Admin or self). Any admin: change own password. Super Admin: platform setting `registrationOpen` (new `settings` collection, enforced in student register). Audit Log viewer page (audit.view).
- Admin creation is still only `npm run create-admin`.

## Testing status
Build environment has no network: `npm install` and MongoDB unavailable. Done: `node --check` on every server file, existing permissions tests (5/5), loaded the 30 components from `src/learn/data.ts` (all images exist), weak TypeScript pass without React types.
NOT done: `npm run build`, `npm run test:api` (needs express), live API/browser tests.

## Next task (run on your machine)
1. `npm install`, `npm run build`, `npm run test:api`.
2. `npm run db:counts`, then `npm run migrate:schools` dry run, then `-- --apply`; `npm run seed:components`.
3. Log in as admin and exercise each page.
