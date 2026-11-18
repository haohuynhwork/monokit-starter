import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { PostNotFoundError } from "../../domain/post.errors.js";
import { checkCanPublish } from "../../domain/post.js";
import {
  POST_REPOSITORY,
  type PostRepository,
} from "../../domain/post.repository.js";
import { UnpublishPostCommand } from "./unpublish-post.command.js";

@CommandHandler(UnpublishPostCommand)
export class UnpublishPostHandler
  implements ICommandHandler<UnpublishPostCommand>
{
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
  ) {}

  async execute({ postId, actor }: UnpublishPostCommand): Promise<void> {
    const post = await this.posts.findById(postId);
    if (!post) {
      throw new PostNotFoundError();
    }
    checkCanPublish(actor, post);
    post.unpublish();
    await this.posts.save(post);
  }
}
