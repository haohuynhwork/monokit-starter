import { CommandBus } from "@nestjs/cqrs";
import { Args, Mutation, Resolver } from "@nestjs/graphql";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { SendTestEmailCommand } from "../application/commands/send-test-email.command.js";
import {
  type SendTestEmailDto,
  sendTestEmailSchema,
} from "../http/mail.dto.js";
import { SendTestEmailInput, SentTestEmailModel } from "./mail.model.js";

// Same as MailController
@Resolver()
export class MailResolver {
  constructor(private readonly commands: CommandBus) {}

  @RequirePermission("settings:manage")
  @Mutation(() => SentTestEmailModel, {
    description: "Send a test email with the mail setting",
  })
  sendTestEmail(
    @CurrentUser() user: AuthUser,
    @Args(
      "input",
      {
        type: () => SendTestEmailInput,
        defaultValue: {},
      },
      new ZodValidationPipe(sendTestEmailSchema),
    )
    input: SendTestEmailDto,
  ): Promise<SentTestEmailModel> {
    return this.commands.execute(
      new SendTestEmailCommand(user.id, input.sync, input.to),
    );
  }
}
