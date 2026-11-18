import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { SessionNotFoundError } from "../../domain/auth.errors.js";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../../domain/session.repository.js";
import { RevokeSessionCommand } from "./revoke-session.command.js";

@CommandHandler(RevokeSessionCommand)
export class RevokeSessionHandler
  implements ICommandHandler<RevokeSessionCommand>
{
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  async execute({ userId, sessionId }: RevokeSessionCommand): Promise<void> {
    const session = await this.sessions.findById(sessionId);
    // Someone else's session looks the same as a missing one
    if (!session?.isOwnedBy(userId)) {
      throw new SessionNotFoundError();
    }
    session.revoke(new Date());
    await this.sessions.save(session);
  }
}
