import { Inject } from "@nestjs/common";
import { CommandBus, CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { SubmitContactMessageCommand } from "../../../contact/application/commands/submit-contact-message.command.js";
import { checkContactMessage, findBlock } from "../../domain/block-types.js";
import { ContactFormNotFoundError } from "../../domain/page.errors.js";
import {
  PAGE_REPOSITORY,
  type PageRepository,
} from "../../domain/page.repository.js";
import { SendContactMessageCommand } from "./send-contact-message.command.js";

// Pages owns the form (which block, which fields); the contact context
// stores the message and mails it
@CommandHandler(SendContactMessageCommand)
export class SendContactMessageHandler
  implements ICommandHandler<SendContactMessageCommand>
{
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pages: PageRepository,
    private readonly commands: CommandBus,
  ) {}

  async execute({
    pageId,
    blockId,
    fields,
    ip,
    userAgent,
  }: SendContactMessageCommand): Promise<void> {
    const page = await this.pages.findById(pageId);
    const { status, publishedAt, title } = page?.snapshot() ?? {};
    const live =
      status !== undefined &&
      status !== "draft" &&
      !!publishedAt &&
      Date.parse(publishedAt) <= Date.now();
    const block = live ? findBlock(page!.blocks(), blockId) : null;
    if (block?.type !== "contactForm") {
      throw new ContactFormNotFoundError();
    }
    const message = checkContactMessage(block, fields);

    await this.commands.execute(
      new SubmitContactMessageCommand(
        {
          pageTitle: title!,
          fields: message,
          ip,
          userAgent,
        },
        // The block's address, else the site's sender address
        (block.props.to as string | undefined) ?? null,
      ),
    );
  }
}
