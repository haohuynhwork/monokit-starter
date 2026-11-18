import { Inject } from "@nestjs/common";
import { CommandBus, CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { AttachAssetCommand } from "../../../storage/application/commands/attach-asset.command.js";
import { DeleteAssetCommand } from "../../../storage/application/commands/delete-asset.command.js";
import { EnsureFolderCommand } from "../../../storage/application/commands/ensure-folder.command.js";
import { UploadAssetCommand } from "../../../storage/application/commands/upload-asset.command.js";
import { AVATAR_POLICY } from "../../../storage/domain/file-policy.js";
import {
  ROLE_PERMISSIONS_READER,
  type RolePermissionsReader,
} from "../../domain/role-permissions.reader.js";
import { UserNotFoundError } from "../../domain/user.errors.js";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/user.repository.js";
import { SetAvatarCommand } from "./set-avatar.command.js";

// The avatar is an asset usage (ownerType 'user', slot 'avatar', a single
// slot): upload, attach, then delete the image it replaced
@CommandHandler(SetAvatarCommand)
export class SetAvatarHandler implements ICommandHandler<SetAvatarCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly commands: CommandBus,
    @Inject(ROLE_PERMISSIONS_READER)
    private readonly roles: RolePermissionsReader,
  ) {}

  async execute(command: SetAvatarCommand): Promise<bigint> {
    // Deleted users are not found, so they can't get an avatar
    const user = await this.users.findById(command.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    // All avatars in one public folder of the media library
    const folderId = await this.commands.execute(
      new EnsureFolderCommand("avatars", "Avatars", "public"),
    );
    // Storage checks type and size; avatars are public (no signed URLs)
    const assetId = await this.commands.execute(
      new UploadAssetCommand(
        command.content,
        command.filename,
        AVATAR_POLICY,
        "public",
        {
          id: command.userId,
          permissions: await this.roles.permissionsOf(user.role),
        },
        folderId,
      ),
    );

    let replaced: bigint[];
    try {
      replaced = await this.commands.execute(
        new AttachAssetCommand("user", command.userId, "avatar", assetId),
      );
    } catch (error) {
      await this.commands.execute(new DeleteAssetCommand(assetId));
      throw error;
    }
    // Old images are used nowhere else, so they can go
    await deleteAssets(this.commands, replaced);
    return assetId;
  }
}

// Avatar images belong to their user; best effort, they are already detached
export async function deleteAssets(
  commands: CommandBus,
  assetIds: bigint[],
): Promise<void> {
  for (const id of assetIds) {
    try {
      await commands.execute(new DeleteAssetCommand(id));
    } catch {
      // Used elsewhere or already gone: leave it
    }
  }
}
