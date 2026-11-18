import { Inject } from "@nestjs/common";
import {
  CommandHandler,
  EventBus,
  type ICommandHandler,
  QueryBus,
} from "@nestjs/cqrs";
import { HasPrivateAssetUsagesQuery } from "../../../storage/application/queries/has-private-asset-usages.query.js";
import { PostPublishedEvent } from "../../domain/events/post-published.event.js";
import { PostNotFoundError } from "../../domain/post.errors.js";
import { checkCanPublish } from "../../domain/post.js";
import {
  POST_REPOSITORY,
  type PostRepository,
} from "../../domain/post.repository.js";
import { GetPostQuery } from "../queries/get-post.query.js";
import { PublishPostCommand } from "./publish-post.command.js";

@CommandHandler(PublishPostCommand)
export class PublishPostHandler implements ICommandHandler<PublishPostCommand> {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    private readonly queries: QueryBus,
    private readonly events: EventBus,
  ) {}

  async execute({
    postId,
    actor,
    at,
    meta,
  }: PublishPostCommand): Promise<void> {
    const post = await this.posts.findById(postId);
    if (!post) {
      throw new PostNotFoundError();
    }
    checkCanPublish(actor, post);
    post.publish(
      new Date(),
      {
        parentReachable: await this.posts.isReachable(post.parentId),
        hasPrivateFiles: await this.queries.execute(
          new HasPrivateAssetUsagesQuery("post", postId),
        ),
      },
      at,
    );
    await this.posts.save(post);

    // After the commit; scheduled posts go live later, without an event yet
    const saved = await this.queries.execute(new GetPostQuery(postId));
    if (saved?.live && saved.path) {
      this.events.publish(
        new PostPublishedEvent(postId, saved.title, saved.path, actor.id, meta),
      );
    }
  }
}
