import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { PostNotFoundError } from "../../domain/post.errors.js";
import { checkCanEdit } from "../../domain/post.js";
import {
  POST_REPOSITORY,
  type PostRepository,
} from "../../domain/post.repository.js";
import { checkPathFree } from "../post-path.js";
import { MovePostCommand } from "./move-post.command.js";

@CommandHandler(MovePostCommand)
export class MovePostHandler implements ICommandHandler<MovePostCommand> {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    private readonly queries: QueryBus,
  ) {}

  async execute({ postId, parentId, actor }: MovePostCommand): Promise<void> {
    const post = await this.posts.findById(postId);
    if (!post) {
      throw new PostNotFoundError();
    }
    checkCanEdit(actor, post);
    if (post.parentId === parentId) {
      return;
    }
    if (parentId !== null && !(await this.posts.findById(parentId))) {
      throw new PostNotFoundError();
    }
    const inside =
      parentId !== null && (await this.posts.isInSubtree(postId, parentId));
    post.moveTo(parentId, inside);
    await checkPathFree(post, this.posts, this.queries);
    await this.posts.save(post);
  }
}
