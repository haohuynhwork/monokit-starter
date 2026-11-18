import { Command } from "@nestjs/cqrs";
import type {
  ContactMessageFields,
  ContactMessageStatus,
} from "../../domain/contact-message.js";

// Staff add a message by hand (from a call or an email); the message is
// rich text. Nothing is mailed. Returns the new id.
export class CreateContactMessageCommand extends Command<bigint> {
  constructor(
    readonly fields: ContactMessageFields,
    readonly status: ContactMessageStatus,
  ) {
    super();
  }
}
