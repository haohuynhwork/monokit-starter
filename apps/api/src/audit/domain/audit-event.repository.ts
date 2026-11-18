import type { AuditEventRow } from "./audit-event.js";

export interface AuditEventRepository {
  insert(row: AuditEventRow): Promise<void>;
  // Retention: removes rows that occurred before the cutoff
  deleteOlderThan(cutoff: Date): Promise<void>;
}

export const AUDIT_EVENT_REPOSITORY = Symbol("AUDIT_EVENT_REPOSITORY");
