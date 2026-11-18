import { Query } from "@nestjs/cqrs";
import type { AuditCursor, AuditEventPage } from "./audit-event.view.js";

export interface AuditEventFilter {
  entityType?: string;
  entityId?: string;
  actorId?: bigint;
  action?: string;
  // ISO 8601, inclusive
  from?: string;
  to?: string;
}

// The audit log, newest first
export class GetAuditEventsQuery extends Query<AuditEventPage> {
  constructor(
    readonly filter: AuditEventFilter,
    readonly limit: number,
    // Only older than this
    readonly cursor: AuditCursor | null,
  ) {
    super();
  }
}
