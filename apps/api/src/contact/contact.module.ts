import { Module } from "@nestjs/common";
import { HTML_SANITIZER } from "../common/domain/html.js";
import { SanitizeHtmlSanitizer } from "../common/infrastructure/sanitize-html.sanitizer.js";
import { ChangeContactMessageStatusHandler } from "./application/commands/change-contact-message-status.handler.js";
import { CreateContactMessageHandler } from "./application/commands/create-contact-message.handler.js";
import { DeleteContactMessageHandler } from "./application/commands/delete-contact-message.handler.js";
import { OpenContactMessageHandler } from "./application/commands/open-contact-message.handler.js";
import { SubmitContactMessageHandler } from "./application/commands/submit-contact-message.handler.js";
import { CountContactMessagesHandler } from "./application/queries/count-contact-messages.handler.js";
import { GetContactMessageHandler } from "./application/queries/get-contact-message.handler.js";
import { ListContactMessagesHandler } from "./application/queries/list-contact-messages.handler.js";
import { CONTACT_MESSAGE_REPOSITORY } from "./domain/contact-message.repository.js";
import { ContactMessagesResolver } from "./graphql/contact-messages.resolver.js";
import { ContactMessagesController } from "./http/contact-messages.controller.js";
import { PrismaContactMessageRepository } from "./infrastructure/prisma-contact-message.repository.js";

@Module({
  controllers: [
    ContactMessagesController,
  ],
  providers: [
    {
      provide: HTML_SANITIZER,
      useClass: SanitizeHtmlSanitizer,
    },
    {
      provide: CONTACT_MESSAGE_REPOSITORY,
      useClass: PrismaContactMessageRepository,
    },
    SubmitContactMessageHandler,
    CreateContactMessageHandler,
    OpenContactMessageHandler,
    ChangeContactMessageStatusHandler,
    DeleteContactMessageHandler,
    ListContactMessagesHandler,
    CountContactMessagesHandler,
    GetContactMessageHandler,
    ContactMessagesResolver,
  ],
})
export class ContactModule {}
