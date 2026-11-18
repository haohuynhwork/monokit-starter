import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { GetSessionUserQuery } from "../../../users/application/queries/get-session-user.query.js";
import { InvalidTokenError } from "../../domain/auth.errors.js";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../../domain/session.repository.js";
import {
  TOKEN_SERVICE,
  type TokenPair,
  type TokenService,
} from "../../domain/tokens.js";
import { sessionTokens } from "../session-tokens.js";
import { RefreshSessionCommand } from "./refresh-session.command.js";

// Each refresh is one row update, so it needs no explicit transaction. Two
// concurrent refreshes with the same token write the same successor.
@CommandHandler(RefreshSessionCommand)
export class RefreshSessionHandler
  implements ICommandHandler<RefreshSessionCommand>
{
  constructor(
    private readonly queries: QueryBus,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  async execute({ refreshToken }: RefreshSessionCommand): Promise<TokenPair> {
    const hash = this.tokens.hashRefreshToken(refreshToken);
    const session = await this.sessions.findByTokenHash(hash);
    if (!session) {
      throw new InvalidTokenError();
    }
    const now = new Date();
    const next = this.tokens.nextRefreshToken(refreshToken);
    const outcome = session.refresh(hash, next.hash, now);

    // This lookup is what makes disabling and deleting take effect
    const user =
      outcome === "reuse"
        ? null
        : await this.queries.execute(new GetSessionUserQuery(session.userId));
    if (!user) {
      session.revoke(now);
    }
    await this.sessions.save(session);
    if (!user) {
      throw new InvalidTokenError();
    }
    return sessionTokens(
      this.tokens,
      {
        userId: session.userId,
        role: user.role,
        sessionId: session.id!,
      },
      next.token,
    );
  }
}
