import { Inject, Logger } from "@nestjs/common";
import {
  CommandBus,
  CommandHandler,
  type ICommandHandler,
  QueryBus,
} from "@nestjs/cqrs";
import { webUrl } from "../../../common/infrastructure/web-path.js";
import { SendEmailCommand } from "../../../mail/application/commands/send-email.command.js";
import {
  FindPasswordResetAccountQuery,
  type PasswordResetAccount,
} from "../../../users/application/queries/find-password-reset-account.query.js";
import { TOKEN_SERVICE, type TokenService } from "../../domain/tokens.js";
import { RequestPasswordResetCommand } from "./request-password-reset.command.js";

@CommandHandler(RequestPasswordResetCommand)
export class RequestPasswordResetHandler
  implements ICommandHandler<RequestPasswordResetCommand>
{
  private readonly logger = new Logger(RequestPasswordResetHandler.name);

  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  async execute({ email }: RequestPasswordResetCommand): Promise<void> {
    const account = await this.queries.execute(
      new FindPasswordResetAccountQuery({
        email,
      }),
    );
    if (!account) {
      return;
    }
    // Not awaited: the answer (and its timing) must be the same whether or
    // not the account exists; a failure is only logged
    this.send(account).catch((error: unknown) =>
      this.logger.warn(
        `Reset link for user ${account.userId} not sent: ${String(error)}`,
      ),
    );
  }

  private async send(account: PasswordResetAccount): Promise<void> {
    const base = webUrl();
    if (!base) {
      this.logger.warn(
        `Reset requested for user ${account.userId}, but PUBLIC_WEB_URL is unset; no mail sent`,
      );
      return;
    }
    const token = await this.tokens.issuePasswordReset(
      account.userId,
      account.fingerprint,
    );
    const link = `${base}/auth/reset-password?token=${encodeURIComponent(token)}`;
    await this.commands.execute(
      new SendEmailCommand({
        to: account.email,
        subject: "Reset your password",
        text: [
          `Hi ${account.name},`,
          "",
          "Open this link to choose a new password:",
          link,
          "",
          "It works once and expires in an hour.",
          "",
          "If you didn't ask for this, ignore this email; your password",
          "hasn't changed.",
        ].join("\n"),
        html: resetHtml(account.name, link),
      }),
    );
  }
}

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );

function resetHtml(name: string, link: string): string {
  const href = escape(link);
  return `<p>Hi ${escape(name)},</p>
<p>Open this link to choose a new password:</p>
<p><a href="${href}">Reset your password</a></p>
<p>It works once and expires in an hour.</p>
<p>If you didn't ask for this, ignore this email; your password hasn't changed.</p>`;
}
