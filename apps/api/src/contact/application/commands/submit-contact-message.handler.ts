import { Inject, Logger } from "@nestjs/common";
import {
  CommandBus,
  CommandHandler,
  type ICommandHandler,
  QueryBus,
} from "@nestjs/cqrs";
import { GetConfigQuery } from "../../../configs/application/queries/get-config.query.js";
import { SendEmailCommand } from "../../../mail/application/commands/send-email.command.js";
import { contactMail } from "../../domain/contact-message.js";
import {
  CONTACT_MESSAGE_REPOSITORY,
  type ContactMessageRepository,
} from "../../domain/contact-message.repository.js";
import { SubmitContactMessageCommand } from "./submit-contact-message.command.js";

@CommandHandler(SubmitContactMessageCommand)
export class SubmitContactMessageHandler
  implements ICommandHandler<SubmitContactMessageCommand>
{
  private readonly logger = new Logger(SubmitContactMessageHandler.name);

  constructor(
    @Inject(CONTACT_MESSAGE_REPOSITORY)
    private readonly messages: ContactMessageRepository,
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  async execute({ message, to }: SubmitContactMessageCommand): Promise<bigint> {
    const id = await this.messages.create(message);

    // Stored is enough: with mail off or failing, the message waits in the
    // panel inbox (mailedAt stays NULL)
    try {
      const { mail } = await this.queries.execute(new GetConfigQuery());
      const recipient = to ?? mail?.fromEmail;
      if (mail && recipient) {
        await this.commands.execute(
          new SendEmailCommand({
            to: recipient,
            ...contactMail(message),
          }),
        );
        await this.messages.markMailed(id);
      }
    } catch (error) {
      this.logger.warn(`Contact message ${id} not mailed: ${String(error)}`);
    }
    return id;
  }
}
