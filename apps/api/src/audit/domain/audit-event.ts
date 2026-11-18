import type { AuditEntry } from "../../common/domain/audit-entry.js";

// The row an AuditEntry becomes (ideas/audit/index.md). Rows are append-only.
export interface AuditEventRow {
  actorId: bigint | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  data: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
}

// '<context>.<verb>', lower snake case, e.g. 'users.role_changed'
const ACTION = /^[a-z][a-z_]*\.[a-z][a-z_]*$/;

export class InvalidAuditActionError extends Error {
  constructor(action: string) {
    super(`Invalid audit action: ${action}`);
  }
}

export function toAuditRow(entry: AuditEntry): AuditEventRow {
  if (entry.action.length > 64 || !ACTION.test(entry.action)) {
    throw new InvalidAuditActionError(entry.action);
  }
  return {
    actorId: entry.actor.userId,
    action: entry.action,
    entityType: entry.entity ? entry.entity.type.slice(0, 32) : null,
    entityId: entry.entity ? entry.entity.id.slice(0, 64) : null,
    data: entry.data ?? {},
    // Column sizes: an IPv6 address fits in 45
    ip: entry.actor.ip?.slice(0, 45) || null,
    userAgent: entry.actor.userAgent?.slice(0, 512) || null,
  };
}
