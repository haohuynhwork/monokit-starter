import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { UserNotFoundError } from "../../domain/user.errors.js";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/user.repository.js";
import { ChangeUserStatusCommand } from "./change-user-status.command.js";

@CommandHandler(ChangeUserStatusCommand)
export class ChangeUserStatusHandler
  implements ICommandHandler<ChangeUserStatusCommand>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute({ userId, status }: ChangeUserStatusCommand): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    user.changeStatus(status, await this.users.countActiveAdmins());
    await this.users.save(user);
  }
}
