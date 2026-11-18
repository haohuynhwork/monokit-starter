import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import type { AuditEntry } from "../../common/domain/audit-entry.js";
import type {
  AuditWriter,
  Tx,
} from "../../common/infrastructure/audit-writer.js";
import { type AuditEventRow, toAuditRow } from "../domain/audit-event.js";
import type { AuditEventRepository } from "../domain/audit-event.repository.js";

// Also the AUDIT_WRITER port: other contexts' repositories call record() with
// their own transaction for guaranteed rows
@Injectable()
export class PrismaAuditEventRepository
  implements AuditEventRepository, AuditWriter
{
  constructor(@InjectDb() private readonly db: Db) {}

  async insert(row: AuditEventRow): Promise<void> {
    await this.db.orm.public.AuditEvent.create(toStored(row));
  }

  async record(tx: Tx, entry: AuditEntry): Promise<void> {
    await tx.orm.public.AuditEvent.create(toStored(toAuditRow(entry)));
  }

  async deleteOlderThan(cutoff: Date): Promise<void> {
    await this.db.orm.public.AuditEvent.where((e) =>
      e.occurredAt.lt(cutoff.toISOString()),
    ).deleteAll();
  }
}

// data is JSON-safe by contract (small and flat); the codec's JsonValue type
// can't see that through Record<string, unknown>
function toStored(row: AuditEventRow) {
  return {
    ...row,
    data: row.data as never,
  };
}
