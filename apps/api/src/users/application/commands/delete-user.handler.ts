import { Inject } from "@nestjs/common";
import { CommandBus, CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { DetachAssetsCommand } from "../../../storage/application/commands/detach-assets.command.js";
import { UserNotFoundError } from "../../domain/user.errors.js";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/user.repository.js";
import { DeleteUserCommand } from "./delete-user.command.js";
import { deleteAssets } from "./set-avatar.handler.js";

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly commands: CommandBus,
  ) {}

  async execute({ userId, actor }: DeleteUserCommand): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }
    user.delete(await this.users.countActiveAdmins(), new Date().toISOString());
    // Guaranteed audit row: written in the same transaction as the delete
    await this.users.save(user, {
      actor,
      action: "users.deleted",
      entity: {
        type: "user",
        id: String(userId),
      },
      data: {},
    });
    // Asset usages have no FK to the user: remove them with it. The avatar is
    // personal data, so its image goes too.
    const detached = await this.commands.execute(
      new DetachAssetsCommand("user", userId, "avatar"),
    );
    await deleteAssets(this.commands, detached);
    await this.commands.execute(new DetachAssetsCommand("user", userId));
  }
}
