import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { PostNotFoundError } from "../../domain/post.errors.js";
import { Post } from "../../domain/post.js";
import {
  POST_REPOSITORY,
  type PostRepository,
} from "../../domain/post.repository.js";
import { CreatePostCommand } from "./create-post.command.js";

@CommandHandler(CreatePostCommand)
export class CreatePostHandler implements ICommandHandler<CreatePostCommand> {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
  ) {}

  async execute({
    title,
    parentId,
    actor,
  }: CreatePostCommand): Promise<bigint> {
    if (parentId !== null && !(await this.posts.findById(parentId))) {
      throw new PostNotFoundError();
    }
    const post = Post.draft({
      title,
      authorId: actor.id,
      parentId,
    });
    await this.posts.save(post);
    return post.id!;
  }
}
