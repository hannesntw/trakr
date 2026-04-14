import { db } from "@/db";
import { auditLog } from "@/db/schema";

export interface AuditParams {
  orgId: number;
  actorId: string;
  actorName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  description: string;
  ipAddress?: string;
  projectId?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit entry. Fire-and-forget — errors are caught silently
 * so audit logging never blocks or fails the parent request.
 */
export function logAudit(params: AuditParams): void {
  db.insert(auditLog)
    .values({
      orgId: params.orgId,
      actorId: params.actorId,
      actorName: params.actorName ?? null,
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      description: params.description,
      ipAddress: params.ipAddress ?? null,
      projectId: params.projectId ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    })
    .then(() => {})
    .catch((err) => {
      console.error("[audit] Failed to log audit entry:", err);
    });
}

/**
 * Extract the client IP from request headers.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
