import { Router } from "express";
import { StudentProgress, Certificate, FinalAttempt } from "../models/index.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../utils/errors.js";
import { createFinalAssessmentService } from "../services/finalAssessmentService.js";

// Final assessment: unlocked after the General IoT quiz AND at least one project quiz are passed.
// 10 random questions out of 300 per attempt, graded here (60% = 6/10 passes); the certificate is generated separately after passing.
// The rules live in services/finalAssessmentService.js so they can be tested without a database; this file only wires them to Express.
const router = Router();
router.use(authenticate, requireRole("student"));
const service = createFinalAssessmentService({ FinalAttempt, Certificate, StudentProgress });

// GET /api/student/final-assessment -> lock state, the CURRENT result and the certificate if already generated
router.get("/final-assessment", asyncHandler(async (req, res) => res.json(await service.getStatus(req.user))));

// POST /api/student/final-assessment/start -> 10 random questions with an attempt id (an unfinished attempt is resumed). 409 ALREADY_PASSED once passed.
router.post("/final-assessment/start", asyncHandler(async (req, res) => res.json(await service.startAttempt(req.user))));

// POST /api/student/final-assessment/submit { attemptId, answers: [0-3, ...] } (all 10 must be answered)
router.post("/final-assessment/submit", asyncHandler(async (req, res) => res.json(await service.submitAttempt(req.user, req.body))));

// POST /api/student/final-assessment/certificate { name } -> 201 when created, 200 with the same certificate when it already exists
router.post("/final-assessment/certificate", asyncHandler(async (req, res) => {
  const result = await service.generateCertificate(req.user, req.body);
  res.status(result.created ? 201 : 200).json(result);
}));

export default router;
