import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { UserNotFoundError } from "../../domain/user.errors.js";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/user.repository.js";
import { ChangeUserRoleCommand } from "./change-user-role.command.js";

@CommandHandler(ChangeUserRoleCommand)
export class ChangeUserRoleHandler
  implements ICommandHandler<ChangeUserRoleCommand>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute({ userId, role, actor }: ChangeUserRoleCommand): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    const from = user.role;
    user.changeRole(role, await this.users.countActiveAdmins());
    // Guaranteed audit row: written in the same transaction as the change
    await this.users.save(
      user,
      from === role
        ? undefined
        : {
            actor,
            action: "users.role_changed",
            entity: {
              type: "user",
              id: String(userId),
            },
            data: {
              from,
              to: role,
            },
          },
    );
  }
}
