import { Inject } from "@nestjs/common";
import { CommandBus, CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { EnsureEntityFolderCommand } from "../../../storage/application/commands/ensure-entity-folder.command.js";
import { PostNotFoundError } from "../../domain/post.errors.js";
import { checkCanEdit } from "../../domain/post.js";
import {
  POST_REPOSITORY,
  type PostRepository,
} from "../../domain/post.repository.js";
import { EnsurePostFolderCommand } from "./ensure-post-folder.command.js";

@CommandHandler(EnsurePostFolderCommand)
export class EnsurePostFolderHandler
  implements ICommandHandler<EnsurePostFolderCommand>
{
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    private readonly commands: CommandBus,
  ) {}

  async execute({ postId, actor }: EnsurePostFolderCommand): Promise<bigint> {
    const post = await this.posts.findById(postId);
    if (!post) {
      throw new PostNotFoundError();
    }
    // Only those who may edit the post work with its files
    checkCanEdit(actor, post);
    return this.commands.execute(
      new EnsureEntityFolderCommand("post", postId, post.snapshot().title),
    );
  }
}
