import { AuditLog } from "../models/index.js";

/**
 * Writes one audit entry. It NEVER throws: a logging problem must not break the admin's request.
 * `entry.actor` (an Admin document) overrides `req.user`, which is needed for login where req.user is not set yet.
 */
export async function logAudit(req, entry) {
  try {
    const actor = entry.actor ?? req?.user ?? null;
    await AuditLog.create({
      actor: actor?._id,
      actorEmail: actor?.email ?? entry.actorEmail ?? "",
      actorRole: actor ? (actor.adminRole ?? "admin") : "",
      action: entry.action,
      targetType: entry.targetType ?? "",
      targetId: entry.targetId ? String(entry.targetId) : "",
      summary: (entry.summary ?? "").slice(0, 300),
      meta: entry.meta,
      ip: req?.ip ?? "",
      userAgent: String(req?.headers?.["user-agent"] ?? "").slice(0, 200),
    });
  } catch (err) {
    console.error("[audit] could not write entry:", err.message);
  }
}
