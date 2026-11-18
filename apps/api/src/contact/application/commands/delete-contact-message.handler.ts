import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { ContactMessageNotFoundError } from "../../domain/contact.errors.js";
import {
  CONTACT_MESSAGE_REPOSITORY,
  type ContactMessageRepository,
} from "../../domain/contact-message.repository.js";
import { DeleteContactMessageCommand } from "./delete-contact-message.command.js";

@CommandHandler(DeleteContactMessageCommand)
export class DeleteContactMessageHandler
  implements ICommandHandler<DeleteContactMessageCommand>
{
  constructor(
    @Inject(CONTACT_MESSAGE_REPOSITORY)
    private readonly messages: ContactMessageRepository,
  ) {}

  async execute({ id }: DeleteContactMessageCommand): Promise<void> {
    if (!(await this.messages.delete(id))) {
      throw new ContactMessageNotFoundError();
    }
  }
}
