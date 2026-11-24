import { z } from "zod";

const text = (label, min, max) =>
  z.string({ required_error: `${label} is required`, invalid_type_error: `${label} is required` })
    .trim().min(min, `${label} is required`).max(max, `${label} is too long`);

const email = z.string({ required_error: "Email is required", invalid_type_error: "Email is required" })
  .trim().toLowerCase().email("Enter a valid email address").max(120, "Email is too long");

export const newPassword = z.string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters") // bcrypt ignores anything after 72 bytes
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/[0-9]/, "Password must include a number");

export const studentRegisterSchema = z.object({
  name: text("Student name", 2, 80),
  schoolName: text("School name", 2, 120),
  standard: z.coerce.number({ invalid_type_error: "Select your standard", required_error: "Select your standard" })
    .refine((n) => [8, 9, 10, 11, 12].includes(n), "Select your standard"),
  email,
  password: newPassword,
  confirmPassword: z.string({ required_error: "Confirm your password", invalid_type_error: "Confirm your password" }).min(1, "Confirm your password"),
}).refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

// Login: don't reveal password rules, just require non-empty strings.
const loginPassword = z.string({ required_error: "Password is required", invalid_type_error: "Password is required" })
  .min(1, "Password is required").max(200);

export const studentLoginSchema = z.object({
  email,
  password: loginPassword,
});

export const adminLoginSchema = z.object({ email, password: loginPassword });
