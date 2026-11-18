import { Inject } from "@nestjs/common";
import {
  CommandBus,
  CommandHandler,
  type ICommandHandler,
  QueryBus,
} from "@nestjs/cqrs";
import { ResetPasswordCommand } from "../../../users/application/commands/reset-password.command.js";
import { FindPasswordResetAccountQuery } from "../../../users/application/queries/find-password-reset-account.query.js";
import { InvalidResetTokenError } from "../../domain/auth.errors.js";
import { TOKEN_SERVICE, type TokenService } from "../../domain/tokens.js";
import { ResetPasswordWithTokenCommand } from "./reset-password-with-token.command.js";
import { RevokeAllSessionsCommand } from "./revoke-all-sessions.command.js";

// The token must verify and still match the account's current password:
// once any password change happens, every earlier link is stale. Users owns
// the password rules (weak_password).
@CommandHandler(ResetPasswordWithTokenCommand)
export class ResetPasswordWithTokenHandler
  implements ICommandHandler<ResetPasswordWithTokenCommand>
{
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  async execute({
    token,
    newPassword,
    notify,
  }: ResetPasswordWithTokenCommand): Promise<void> {
    let claims: {
      userId: bigint;
      fingerprint: string;
    };
    try {
      claims = await this.tokens.verifyPasswordReset(token);
    } catch {
      throw new InvalidResetTokenError();
    }
    const account = await this.queries.execute(
      new FindPasswordResetAccountQuery({
        userId: claims.userId,
      }),
    );
    if (!account || account.fingerprint !== claims.fingerprint) {
      throw new InvalidResetTokenError();
    }
    await this.commands.execute(
      new ResetPasswordCommand(account.userId, newPassword, notify),
    );
    // Whoever had the old password may hold a session
    await this.commands.execute(new RevokeAllSessionsCommand(account.userId));
  }
}
