import { Inject } from "@nestjs/common";
import { CommandBus, CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { AttachAssetCommand } from "../../../storage/application/commands/attach-asset.command.js";
import { DetachAssetsCommand } from "../../../storage/application/commands/detach-assets.command.js";
import { PostNotFoundError } from "../../domain/post.errors.js";
import { checkCanEdit } from "../../domain/post.js";
import {
  POST_REPOSITORY,
  type PostRepository,
} from "../../domain/post.repository.js";
import { SetPostCoverCommand } from "./set-post-cover.command.js";

// The cover stays in the media library when replaced: it may be used
// elsewhere, unlike an avatar
@CommandHandler(SetPostCoverCommand)
export class SetPostCoverHandler
  implements ICommandHandler<SetPostCoverCommand>
{
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    private readonly commands: CommandBus,
  ) {}

  async execute({
    postId,
    assetId,
    actor,
  }: SetPostCoverCommand): Promise<void> {
    const post = await this.posts.findById(postId);
    if (!post) {
      throw new PostNotFoundError();
    }
    checkCanEdit(actor, post);
    await this.commands.execute(
      assetId === null
        ? new DetachAssetsCommand("post", postId, "cover")
        : new AttachAssetCommand("post", postId, "cover", assetId),
    );
  }
}
