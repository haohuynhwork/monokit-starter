import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { ContactMessageNotFoundError } from "../../domain/contact.errors.js";
import {
  CONTACT_MESSAGE_REPOSITORY,
  type ContactMessageRepository,
} from "../../domain/contact-message.repository.js";
import { ChangeContactMessageStatusCommand } from "./change-contact-message-status.command.js";

@CommandHandler(ChangeContactMessageStatusCommand)
export class ChangeContactMessageStatusHandler
  implements ICommandHandler<ChangeContactMessageStatusCommand>
{
  constructor(
    @Inject(CONTACT_MESSAGE_REPOSITORY)
    private readonly messages: ContactMessageRepository,
  ) {}

  async execute({
    id,
    status,
  }: ChangeContactMessageStatusCommand): Promise<void> {
    if (!(await this.messages.changeStatus(id, status))) {
      throw new ContactMessageNotFoundError();
    }
  }
}
