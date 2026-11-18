import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { GetSessionUserQuery } from "../../../users/application/queries/get-session-user.query.js";
import { InvalidTokenError } from "../../domain/auth.errors.js";
import { Session } from "../../domain/session.js";
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
import { StartSessionCommand } from "./start-session.command.js";

@CommandHandler(StartSessionCommand)
export class StartSessionHandler
  implements ICommandHandler<StartSessionCommand>
{
  constructor(
    private readonly queries: QueryBus,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  async execute({ userId, device }: StartSessionCommand): Promise<TokenPair> {
    const user = await this.queries.execute(new GetSessionUserQuery(userId));
    if (!user) {
      throw new InvalidTokenError();
    }
    const refresh = this.tokens.newRefreshToken();
    const session = Session.start(userId, refresh.hash, device, new Date());
    await this.sessions.save(session);
    return sessionTokens(
      this.tokens,
      {
        userId,
        role: user.role,
        sessionId: session.id!,
      },
      refresh.token,
    );
  }
}
