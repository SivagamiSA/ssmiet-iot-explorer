import { ZodError } from "zod";
import { HttpError } from "../utils/errors.js";

export const notFound = (_req, _res, next) => next(new HttpError(404, "Not found."));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const fields = {};
    for (const issue of err.issues) fields[issue.path.join(".") || "form"] ??= issue.message;
    return res.status(400).json({ message: "Please correct the highlighted fields.", fields });
  }
  if (err?.code === 11000) {
    const key = Object.keys(err.keyPattern ?? {})[0];
    if (key === "email") return res.status(409).json({ message: "This email address is already registered.", fields: { email: "This email address is already registered." } });
    return res.status(409).json({ message: "That record already exists. Please refresh the page and try again.", fields: { code: "DUPLICATE" } });
  }
  if (err?.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid request body." });
  if (err?.type === "entity.too.large") return res.status(413).json({ message: "Request too large." });
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message, fields: err.fields });

  if (/^Mongo(Server)?(Selection|Network)|MongoNotConnected/.test(err?.name ?? "")) {
    console.error("[error] database unavailable:", err.name);
    return res.status(503).json({ message: "The database is temporarily unavailable. Please try again in a moment." });
  }
  console.error("[error]", err); // full detail stays in the server console only
  res.status(500).json({ message: "Something went wrong on the server. Please try again." });
}
