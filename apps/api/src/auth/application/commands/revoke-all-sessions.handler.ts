import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  SESSION_REPOSITORY,
  type SessionRepository,
} from "../../domain/session.repository.js";
import { RevokeAllSessionsCommand } from "./revoke-all-sessions.command.js";

@CommandHandler(RevokeAllSessionsCommand)
export class RevokeAllSessionsHandler
  implements ICommandHandler<RevokeAllSessionsCommand>
{
  constructor(
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  async execute({ userId }: RevokeAllSessionsCommand): Promise<void> {
    await this.sessions.revokeAllForUser(userId, new Date());
  }
}
