import { Inject } from "@nestjs/common";
import { CommandBus, CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { DetachAssetsCommand } from "../../../storage/application/commands/detach-assets.command.js";
import { UserNotFoundError } from "../../domain/user.errors.js";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/user.repository.js";
import { RemoveAvatarCommand } from "./remove-avatar.command.js";
import { deleteAssets } from "./set-avatar.handler.js";

@CommandHandler(RemoveAvatarCommand)
export class RemoveAvatarHandler
  implements ICommandHandler<RemoveAvatarCommand>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly commands: CommandBus,
  ) {}

  async execute({ userId }: RemoveAvatarCommand): Promise<void> {
    if (!(await this.users.findById(userId))) {
      throw new UserNotFoundError();
    }
    const detached = await this.commands.execute(
      new DetachAssetsCommand("user", userId, "avatar"),
    );
    await deleteAssets(this.commands, detached);
  }
}
