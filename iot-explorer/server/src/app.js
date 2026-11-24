import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.js";
import { studentRouter, adminRouter } from "./routes/roleChecks.js";
import studentRoutes from "./routes/student.js";
import activityRoutes from "./routes/activities.js";
import finalAssessmentRoutes from "./routes/finalAssessment.js";
import adminRoutes from "./routes/admin/index.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (env.trustProxy) app.set("trust proxy", 1); // only when deployed behind a host's proxy (set TRUST_PROXY=true)
  // Same CSP defaults as before; upgrade-insecure-requests only in production so a local http preview of the built site still loads.
  app.use(helmet({ contentSecurityPolicy: { useDefaults: true, directives: { "img-src": ["'self'", "data:", "blob:"], "upgrade-insecure-requests": env.nodeEnv === "production" ? [] : null } } }));
  // The website normally comes from this same server (same origin, no CORS needed). CLIENT_ORIGIN lists extra allowed origins.
  app.use(cors({ origin: (origin, cb) => cb(null, !origin || env.clientOrigins.includes(origin)) }));
  app.use(express.json({ limit: "10kb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRoutes);
  app.use("/api/student", studentRouter);
  app.use("/api/student", studentRoutes);
  app.use("/api/student", activityRoutes); // Simulation lab + quizzes (saved in the existing StudentProgress / Certificate collections)
  app.use("/api/student", finalAssessmentRoutes); // Final assessment (300-question bank, 10 per attempt) + final certificate
  app.use("/api/admin", adminRouter); // existing /ping
  app.use("/api/admin", adminRoutes); // Admin Portal API (Phase 1: me, dashboard, audit-log)

  // Production: serve the built website (dist/) from the same server, so /api needs no CORS and no localhost URL.
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../dist");
  if (fs.existsSync(path.join(dist, "index.html"))) {
    app.use(express.static(dist, { index: false, maxAge: "1h" }));
    app.get(/^\/(?!api(\/|$)).*/, (_req, res) => res.sendFile(path.join(dist, "index.html"))); // React Router deep links and refreshes
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
