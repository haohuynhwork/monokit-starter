import { Inject } from "@nestjs/common";
import {
  CommandBus,
  CommandHandler,
  type ICommandHandler,
  QueryBus,
} from "@nestjs/cqrs";
import {
  HTML_SANITIZER,
  type HtmlSanitizer,
  inlineAssetKeys,
  inlineFileKeys,
} from "../../../common/domain/html.js";
import { SetAssetUsagesCommand } from "../../../storage/application/commands/set-asset-usages.command.js";
import { FindPublicFilesByKeysQuery } from "../../../storage/application/queries/find-public-files.query.js";
import { PostNotFoundError } from "../../domain/post.errors.js";
import { type Actor, checkCanEdit } from "../../domain/post.js";
import {
  POST_REPOSITORY,
  type PostRepository,
} from "../../domain/post.repository.js";
import {
  checkCanManageTags,
  normalizeTagNames,
} from "../../domain/post-tag.js";
import {
  POST_TAG_REPOSITORY,
  type PostTagRepository,
} from "../../domain/post-tag.repository.js";
import { checkPathFree } from "../post-path.js";
import { UpdatePostCommand } from "./update-post.command.js";

@CommandHandler(UpdatePostCommand)
export class UpdatePostHandler implements ICommandHandler<UpdatePostCommand> {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    @Inject(POST_TAG_REPOSITORY) private readonly tags: PostTagRepository,
    @Inject(HTML_SANITIZER) private readonly sanitizer: HtmlSanitizer,
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  async execute({ postId, changes, actor }: UpdatePostCommand): Promise<void> {
    const post = await this.posts.findById(postId);
    if (!post) {
      throw new PostNotFoundError();
    }
    checkCanEdit(actor, post);

    const { slug, content, tags, ...rest } = changes;
    post.edit({
      ...rest,
      ...(content !== undefined && {
        content: this.sanitizer.sanitize(content),
      }),
    });
    if (slug !== undefined) {
      post.setSlug(slug);
      await checkPathFree(post, this.posts, this.queries);
    }
    if (tags !== undefined) {
      post.setTags(await this.resolveTags(tags, actor));
    }
    await this.posts.save(post);

    if (content !== undefined) {
      // Images in the content are 'inline' asset usages: "where is this file
      // used" stays right, and a shown file can't be deleted
      const assetIds = await this.queries.execute(
        new FindPublicFilesByKeysQuery(
          inlineFileKeys(post.allContent),
          inlineAssetKeys(post.allContent),
        ),
      );
      await this.commands.execute(
        new SetAssetUsagesCommand("post", postId, "inline", assetIds),
      );
    }
  }

  // Names -> ids in the given order. New tags are created first, in their
  // own transaction: a tag left unused by a failed save is harmless.
  private async resolveTags(names: string[], actor: Actor): Promise<bigint[]> {
    const tags = normalizeTagNames(names);
    let ids = await this.tags.findIdsBySlugs(tags.map((t) => t.slug));
    const missing = tags.filter((t) => !ids.has(t.slug));
    if (missing.length) {
      checkCanManageTags(actor);
      ids = await this.tags.ensure(tags);
    }
    return tags.map((t) => ids.get(t.slug)!);
  }
}
