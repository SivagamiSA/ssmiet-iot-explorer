# IoT Explorer (Stage 3 Part 1: Student Dashboard)

React + TypeScript + Tailwind (frontend) and Node + Express + Mongoose (backend, in `server/`). One `npm install`, one `npm run dev`.

## Run it in VS Code on Windows

1. Install **Node.js LTS** from nodejs.org (version 18.18 or newer). Restart VS Code afterwards.
2. Unzip the project and open the `iot-explorer` folder in VS Code (File > Open Folder).
3. Open the terminal: Terminal > New Terminal.
4. Put your logo and photos in `public/images/` as before (see `public/images/README.md`).
5. **Set up MongoDB Atlas** (cloud.mongodb.com)
   - Create a free cluster.
   - Database Access > Add New Database User. Choose a username and password and keep both.
   - Network Access > Add IP Address > "Add Current IP Address". (If your IP changes, e.g. on college Wi-Fi, add `0.0.0.0/0` while learning, and restrict it before going live.)
   - Clusters > Connect > Drivers. Copy the connection string.
   - You do not need to create the database yourself. The app creates `iot_explorer` and its collections on first use.
6. **Create your `.env` file**
   - In the VS Code file list, right-click `.env.example` > Copy, then Paste, and rename the copy to `.env`.
   - Paste your connection string after `MONGODB_URI=` and replace `<password>`/`YOUR_PASSWORD` with your real password. If the password has symbols like `@ : / #`, URL-encode them (for example `@` becomes `%40`).
   - Make a secret for `JWT_SECRET`. Run this in the terminal and paste the output after `JWT_SECRET=`:
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
7. Install: `npm install`
8. **Create your first admin** (there is no public admin sign-up): `npm run create-admin`, then answer the name, email and password prompts.
8b. **Add the starter projects** (approved, so students can see them): `npm run seed`
9. Start everything: `npm run dev`
   - Wait for `[db] Connected to MongoDB Atlas, database "iot_explorer"` and `[api] Running on http://localhost:5000`.
   - Open http://localhost:5173
10. Try it: click **Login** (or Start Learning). On the Student tab choose **Create Account**, register, then log in. Log out, switch to the **Admin** tab and log in with the admin from step 8.

To stop: click in the terminal and press Ctrl+C.

## Simulation Lab and Quizzes (merged from Embedded IoT)

Both live inside the Student Portal menu and use the normal student login, so nothing separate is needed.

- **Projects & Simulation** (`/student/projects`): 17 Arduino UNO projects. Each has a guided wiring walkthrough, independent practice with validation, and a completion page. Code: `src/simulation/` (engine, projects, circuit components) and `src/simulation/StudentSimulationPage.jsx` (login + server sync).
- **Quizzes** (`/student/quizzes`): a general quiz plus one per simulation project. Scoring 60% or more issues a certificate (printable). Code: `src/quiz/`.
- **Saved in the existing database**, with no new collections or schema changes: simulation rows go to `studentprogress.simulations`, quiz attempts to `studentprogress.quizResults`, certificates to `certificates`, and points to `studentprogress.points` (30 per completed project, 20 per first quiz pass, each awarded once). The Student Dashboard, badges and Admin Portal reports read these as before.
- API (students only): GET `/api/student/simulations`, PUT `/api/student/simulations/:id`, GET `/api/student/quizzes`, POST `/api/student/quizzes/:id/result` (`server/src/routes/activities.js`).
- **Optional:** `npm run seed:simulations` adds the 17 lab projects to the Projects collection as approved so they appear in the Student Dashboard's project counts and the Admin Portal's Projects and Reports. It only inserts missing projects and never changes existing ones.
- The simulation keeps a browser copy of progress (as in Embedded IoT) and restores completed projects from the server on a new device.

## Where things are
- `src/pages/auth/LoginPage.tsx` the single login page (Student / Admin tabs, Create Account), `src/lib/auth.tsx` login state.
- `server/src/models/` database models (`Student`, `Admin`). Add future collections here (Events, Projects, Lessons, StudentProgress, QuizResults, Certificates). Same database `iot_explorer`.
- `server/src/middleware/auth.js` `authenticate` and `requireRole("admin" | "student")`. Protect every future API route with them.

## API
| Method & path | Who | Purpose |
|---|---|---|
| POST `/api/auth/student/register` | public | create student (name, schoolName, standard 8-12, email, password, confirmPassword) |
| POST `/api/auth/student/login` | public | email + password |
| POST `/api/auth/admin/login` | public | admin email + password |
| GET `/api/auth/me` | any logged-in user | current user |
| GET `/api/student/dashboard` | students only | all dashboard data in one call |
| GET `/api/student/ping` | students only | role check |
| GET `/api/admin/ping` | admins only | role check |

## Troubleshooting
- `Could not connect to MongoDB Atlas`: Atlas Network Access does not include your IP, or the password in `.env` is wrong.
- `Missing JWT_SECRET` / `Missing MONGODB_URI`: `.env` is missing, misnamed (`.env.txt`), or not in the project root.
- "Cannot reach the server" on the website: the API is not running. Check the terminal for errors.
- Rate limit message ("Too many attempts"): wait 15 minutes, or restart the server while testing.
- Port 5000 busy: set `PORT=5001` in `.env` and change the port in `vite.config.ts`.

## Admin Portal (Stage 3 Part 3, Phase 1)
- Admin sign-in: **/admin/login** (separate page). Admin Portal: **/admin/dashboard**. The older `/login?tab=admin` tab still works.
- Roles: **Super Admin** (everything) and **Admin** (only the permissions saved on the account). Permission list: `server/src/utils/permissions.js`.
- Accounts created before Phase 1 keep working: they read as a plain Admin with no permissions until a Super Admin grants some.
- Make your designated primary admin the Super Admin (safe, one account only, with backup + undo):
  1. `npm run db:counts` (read-only report of what exists)
  2. `npm run migrate-admins -- --email you@example.com` (preview, changes nothing)
  3. `npm run migrate-admins -- --email you@example.com --apply`
  4. Undo if needed: `npm run migrate-admins -- --rollback server/scripts/backups/<file>.json --apply`
  (For a brand-new database, `npm run create-admin -- --super` creates the Super Admin directly.)
- Tests (no database needed): `npm run test:api`
- New API: `GET /api/admin/me`, `GET /api/admin/dashboard`, `GET /api/admin/audit-log` (audit entries are written to the `auditlogs` collection).

## Final Assessment (added)

- Quizzes no longer show a mini certificate. Passing a quiz (60%+) records the result and gives points once.
- The Final Assessment (`/student/final-assessment`) unlocks after the **General IoT quiz** and **any one project quiz** are passed.
- Each attempt draws 50 random questions from the 300-question bank in `server/src/data/finalAssessment.json` (kept on the server; answers are never sent to the browser). Pass mark: 60% (30/50). Points for the first pass: `FINAL_POINTS` in `server/src/data/finalAssessment.js`.
- Passing issues the blue certificate (`public/images/final-certificate.jpeg` + name, school, date and ID drawn on top). The student can set the printed name **once**; it is then locked.
- Unlimited retakes until 60%+. Only the CURRENT result is kept: a new graded attempt overwrites the earlier failed one. Every start gets a new attempt id; all 50 answers are required; duplicate submits return the stored result. Once passed, the backend refuses new attempts for good (unique indexes `one_open_attempt_per_student` / `one_pass_per_student` on `finalattempts`).
- Quizzes page button: Start Final Assessment -> Retake Final Assessment (after a fail) -> Generate Certificate (after the pass).
- Tests: `npm run test:api` (includes `server/tests/final-assessment.test.js`).

## Final Assessment and Certificate (current behaviour)

This section replaces the older "Final Assessment (added)" notes above.

- **10 questions** per attempt, drawn at random from the 300-question bank; all must be answered. **Pass = 60% (6/10)**.
- **Fail:** the latest score is shown, **Start Final Assessment** stays available, unlimited retakes. A new graded attempt replaces the earlier failed result (one record per student).
- **Pass:** saved permanently. The backend refuses new attempts (`409 ALREADY_PASSED`) even for direct API calls; the page shows **Generate Certificate**.
- **Certificate:** the existing blue template. The student can edit the printed name once, before generating; school and standard come from their profile; the issue date is the pass date. There is **no certificate number**. Preview, full-size view, PDF, PNG and print are available. One certificate per student; repeating the request returns the same certificate (`200`; first creation is `201`).
- Code: rules in `server/src/services/finalAssessmentService.js`, routes in `server/src/routes/finalAssessment.js`, drawing in `src/quiz/certificateDraw.js`.

### Database repair (safe, repeatable, deletes nothing)

Runs automatically at server start (disable with `DB_AUTO_REPAIR=false`). To preview or run it by hand:

```
npm run db:repair-assessment                 # preview only
npm run db:repair-assessment -- --apply      # apply
npm run db:repair-assessment -- --apply --drop-index=<name>   # also drop one named unexpected unique index on certificates
```
It keeps each student's newest valid passing attempt and marks older duplicate passes `expired` (`wasPassed: true`, `expiredReason: "duplicate_pass_repair"`), expires duplicate open attempts, drops the old unique `certificateId` index, reports (never drops) any other unexpected unique index, and then creates `one_open_attempt_per_student`, `one_pass_per_student` and `one_final_certificate_per_student`. Existing certificate documents are not modified.

### If you see `querySrv ECONNREFUSED _mongodb._tcp...mongodb.net`
That is a DNS/network failure on the computer or network running the server (the database was never reached), not a code or password problem. Try, in order: check the host in `MONGODB_URI`; another network (phone hotspot); set the computer's DNS to 8.8.8.8 / 1.1.1.1 or add `MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1` to `.env`; or use Atlas's non-SRV `mongodb://` connection string. On Render this error is unlikely; there, check Atlas **Network Access** instead.

## Deploying on Render (with iotexplorer.com)

One Render **Web Service** runs the API and serves the built website, so `/api` is same-origin (no CORS, no API URL to configure).

1. Push the project to a GitHub repository (the `.gitignore` already excludes `.env` and `node_modules`).
2. Render dashboard > **New > Blueprint** and pick the repo (uses `render.yaml`), or **New > Web Service** with: Build Command `npm ci --include=dev && npm run build`, Start Command `npm start`, Health Check Path `/api/health`.
3. Environment tab: `MONGODB_URI` (your existing Atlas string), `JWT_SECRET` (32+ random characters; keep it fixed), `NODE_ENV=production`, `TRUST_PROXY=true`, `CLIENT_ORIGIN=https://iotexplorer.com,https://www.iotexplorer.com`.
4. **Atlas > Network Access:** Render's outbound IPs can change, so either add the outbound IPs shown in the service's **Connect > Outbound** menu or allow `0.0.0.0/0` (then rely on a strong database user password).
5. **Custom domain:** Service > Settings > Custom Domains > add `iotexplorer.com` and `www.iotexplorer.com`. At your domain registrar add the DNS records Render shows (normally an `A` record for the root domain and a `CNAME` for `www` pointing to your `...onrender.com` address; remove conflicting old `A`/`AAAA` records). Render issues the HTTPS certificate automatically once DNS has propagated.
6. Open `https://<your-service>.onrender.com/api/health` (should return `{"ok":true}`), then the site, then log in.
7. Check the first deploy's logs for `[db] Connected to MongoDB Atlas` and any `[db] Preserved...` repair lines. Free-plan services sleep when idle, so the first request after a pause is slow.
