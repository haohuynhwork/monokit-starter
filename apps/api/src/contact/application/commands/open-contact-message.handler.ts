import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { ContactMessageNotFoundError } from "../../domain/contact.errors.js";
import { statusOnOpen } from "../../domain/contact-message.js";
import {
  CONTACT_MESSAGE_REPOSITORY,
  type ContactMessageRepository,
} from "../../domain/contact-message.repository.js";
import { OpenContactMessageCommand } from "./open-contact-message.command.js";

@CommandHandler(OpenContactMessageCommand)
export class OpenContactMessageHandler
  implements ICommandHandler<OpenContactMessageCommand>
{
  constructor(
    @Inject(CONTACT_MESSAGE_REPOSITORY)
    private readonly messages: ContactMessageRepository,
  ) {}

  async execute({ id }: OpenContactMessageCommand): Promise<void> {
    const status = await this.messages.findStatus(id);
    if (status === null) {
      throw new ContactMessageNotFoundError();
    }
    const next = statusOnOpen(status);
    if (next !== status) {
      await this.messages.changeStatus(id, next);
    }
  }
}
