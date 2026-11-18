import { Command } from "@nestjs/cqrs";
import type { ContactMessageStatus } from "../../domain/contact-message.js";

export class ChangeContactMessageStatusCommand extends Command<void> {
  constructor(
    readonly id: bigint,
    readonly status: ContactMessageStatus,
  ) {
    super();
  }
}
