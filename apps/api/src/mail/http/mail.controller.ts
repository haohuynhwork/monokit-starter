import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import {
  ApiFailResponse,
  ApiZodBody,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { SendTestEmailCommand } from "../application/commands/send-test-email.command.js";
import {
  type SendTestEmailDto,
  sendTestEmailSchema,
  sentTestEmailSchema,
} from "./mail.dto.js";

@ApiTags("mail")
@Controller("mail")
export class MailController {
  constructor(private readonly commands: CommandBus) {}

  @Post("test")
  @RequirePermission("settings:manage")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Send a test email with the mail setting",
  })
  @ApiZodBody(sendTestEmailSchema)
  @ApiZodResponse(sentTestEmailSchema)
  @ApiFailResponse(400, "Not an email address")
  @ApiFailResponse(
    409,
    "Email is off, or the server refused it (sync), or the queue is down",
  )
  test(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(sendTestEmailSchema)) body: SendTestEmailDto,
  ): Promise<{
    to: string;
    queued: boolean;
  }> {
    return this.commands.execute(
      new SendTestEmailCommand(user.id, body.sync, body.to),
    );
  }
}
