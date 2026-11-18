import { Query } from "@nestjs/cqrs";
import type { ContactMessageStatus } from "../../domain/contact-message.js";

// Non-deleted messages per status, for the inbox tabs; 0 for empty ones
export class CountContactMessagesQuery extends Query<
  Record<ContactMessageStatus, number>
> {}
