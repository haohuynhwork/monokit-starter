import type { Actor } from "./actor.js";

// One audit row to write (ideas/audit/index.md). Shared so a context can
// write a guaranteed row inside its own transaction (AuditWriter) without
// importing the audit context.
export interface AuditEntry {
  actor: Actor;
  // '<context>.<verb>', e.g. 'users.role_changed'
  action: string;
  // Both set or both null
  entity: {
    type: string;
    id: string;
  } | null;
  // Small and flat; never secrets, tokens or full bodies
  data?: Record<string, unknown>;
}
