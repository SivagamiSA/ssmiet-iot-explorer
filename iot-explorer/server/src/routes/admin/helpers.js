import mongoose from "mongoose";
import { z } from "zod";
import { HttpError } from "../../utils/errors.js";

// Small helpers shared by the Admin Portal route files.
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const searchText = (v) => String(v ?? "").trim().slice(0, 80);
export const pageOf = (q) => {
  const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20));
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  return { page, limit, skip: (page - 1) * limit };
};
export const pagesOf = (total, limit) => Math.max(1, Math.ceil(total / limit));
export const idOr404 = (id, what) => {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, `${what} not found.`);
  return id;
};
export const label = (t, min, max) =>
  z.string({ required_error: `${t} is required`, invalid_type_error: `${t} is required` }).trim().min(min, `${t} is required`).max(max, `${t} is too long`);
