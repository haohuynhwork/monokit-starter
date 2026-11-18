import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  HTML_SANITIZER,
  type HtmlSanitizer,
} from "../../../common/domain/html.js";
import { checkStaffMessage } from "../../domain/contact-message.js";
import {
  CONTACT_MESSAGE_REPOSITORY,
  type ContactMessageRepository,
} from "../../domain/contact-message.repository.js";
import { CreateContactMessageCommand } from "./create-contact-message.command.js";

@CommandHandler(CreateContactMessageCommand)
export class CreateContactMessageHandler
  implements ICommandHandler<CreateContactMessageCommand>
{
  constructor(
    @Inject(CONTACT_MESSAGE_REPOSITORY)
    private readonly messages: ContactMessageRepository,
    @Inject(HTML_SANITIZER) private readonly sanitizer: HtmlSanitizer,
  ) {}

  execute({ fields, status }: CreateContactMessageCommand): Promise<bigint> {
    const clean = checkStaffMessage(fields);
    const html = clean.message ? this.sanitizer.sanitize(clean.message) : "";
    return this.messages.create({
      pageTitle: "",
      fields: {
        ...clean,
        message: html.trim() || undefined,
      },
      messageFormat: "html",
      status,
      ip: null,
      userAgent: null,
    });
  }
}
