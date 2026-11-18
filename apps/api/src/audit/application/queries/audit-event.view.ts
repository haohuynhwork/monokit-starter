export interface AuditEventView {
  id: string;
  occurredAt: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  data: Record<string, unknown>;
  // Null for the system and anonymous attempts; a deleted user keeps their
  // id with the name "Deleted user"
  actor: {
    id: string;
    name: string;
  } | null;
  ip: string | null;
  userAgent: string | null;
}

export interface AuditEventPage {
  items: AuditEventView[];
  // Pass as `cursor` for older events; null at the end
  nextCursor: string | null;
}

export const DELETED_USER = "Deleted user";

// Opaque cursor on (occurredAt, id), newest first
export interface AuditCursor {
  occurredAt: string;
  id: bigint;
}

export function encodeCursor(c: AuditCursor): string {
  return Buffer.from(`${c.occurredAt}|${c.id}`).toString("base64url");
}

// Null when malformed
export function decodeCursor(cursor: string): AuditCursor | null {
  const [occurredAt, id] = Buffer.from(cursor, "base64url")
    .toString()
    .split("|");
  if (
    !occurredAt ||
    !id ||
    !/^[1-9]\d{0,18}$/.test(id) ||
    Number.isNaN(Date.parse(occurredAt))
  ) {
    return null;
  }
  return {
    occurredAt,
    id: BigInt(id),
  };
}
