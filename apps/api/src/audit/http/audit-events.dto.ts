import { z } from "zod";

const id = z.string().regex(/^[1-9]\d{0,18}$/, "Invalid id");

export const listAuditEventsSchema = z.object({
  entityType: z.string().trim().min(1).max(32).optional(),
  entityId: z.string().trim().min(1).max(64).optional(),
  actorId: id.optional(),
  action: z.string().trim().min(1).max(64).optional(),
  from: z.iso
    .datetime({
      offset: true,
    })
    .optional(),
  to: z.iso
    .datetime({
      offset: true,
    })
    .optional(),
  // nextCursor of the previous page
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListAuditEventsDto = z.infer<typeof listAuditEventsSchema>;

// --- Responses (docs only; match AuditEventView / AuditEventPage) ---

export const auditEventViewSchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  action: z.string(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  data: z.record(z.string(), z.unknown()),
  actor: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
});

export const auditEventPageSchema = z.object({
  items: z.array(auditEventViewSchema),
  nextCursor: z.string().nullable(),
});
