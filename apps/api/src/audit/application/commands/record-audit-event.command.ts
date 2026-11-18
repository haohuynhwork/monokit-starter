import { Command } from "@nestjs/cqrs";
import type { AuditEntry } from "../../../common/domain/audit-entry.js";

// Best effort: a failure is logged, never thrown (see "Delivery" in
// ideas/audit/index.md)
export class RecordAuditEventCommand extends Command<void> {
  constructor(readonly entry: AuditEntry) {
    super();
  }
}
