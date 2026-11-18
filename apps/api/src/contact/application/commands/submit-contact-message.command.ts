import { Command } from "@nestjs/cqrs";
import type { NewContactMessage } from "../../domain/contact-message.js";

// Stores a checked message, then mails it to `to` (else the site's sender
// address). Returns the new id.
export class SubmitContactMessageCommand extends Command<bigint> {
  constructor(
    readonly message: NewContactMessage,
    readonly to: string | null,
  ) {
    super();
  }
}
