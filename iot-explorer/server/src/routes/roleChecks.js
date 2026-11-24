import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";

// Tiny role-protected endpoints. They prove (and let you test) that students cannot reach admin APIs.
// Later stages add real routes the same way:  router.use(authenticate, requireRole("admin"))
export const studentRouter = Router();
studentRouter.get("/ping", authenticate, requireRole("student"), (req, res) => res.json({ ok: true, area: "student", name: req.user.name }));

export const adminRouter = Router();
adminRouter.get("/ping", authenticate, requireRole("admin"), (req, res) => res.json({ ok: true, area: "admin", name: req.user.name }));
