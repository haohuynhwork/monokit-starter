import type { Db } from "@packages/nest";
import type { AuditEntry } from "../domain/audit-entry.js";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Port for guaranteed audit rows: a repository writes the row in the same
// transaction as the change, so both commit or neither does (see "Delivery"
// in ideas/audit/index.md). Implemented in audit/infrastructure and provided
// globally by AuditModule; other contexts depend on this interface only.
export interface AuditWriter {
  record(tx: Tx, entry: AuditEntry): Promise<void>;
}

export const AUDIT_WRITER = Symbol("AUDIT_WRITER");
