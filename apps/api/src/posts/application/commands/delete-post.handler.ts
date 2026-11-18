import { Inject } from "@nestjs/common";
import { CommandBus, CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { DetachAssetsCommand } from "../../../storage/application/commands/detach-assets.command.js";
import { PostNotFoundError } from "../../domain/post.errors.js";
import { checkCanEdit } from "../../domain/post.js";
import {
  POST_REPOSITORY,
  type PostRepository,
} from "../../domain/post.repository.js";
import { DeletePostCommand } from "./delete-post.command.js";

@CommandHandler(DeletePostCommand)
export class DeletePostHandler implements ICommandHandler<DeletePostCommand> {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    private readonly commands: CommandBus,
  ) {}

  async execute({ postId, actor }: DeletePostCommand): Promise<void> {
    const post = await this.posts.findById(postId);
    if (!post) {
      throw new PostNotFoundError();
    }
    checkCanEdit(actor, post);
    post.delete(new Date(), await this.posts.hasLiveChildren(postId));
    await this.posts.save(post);
    // Asset usages have no FK to the post: release its files (they stay in
    // the library)
    await this.commands.execute(new DetachAssetsCommand("post", postId));
  }
}
