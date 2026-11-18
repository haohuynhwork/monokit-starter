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
import { findActiveLocale } from "../../../geo/application/queries/resolve-locale.query.js";
import { SetAssetUsagesCommand } from "../../../storage/application/commands/set-asset-usages.command.js";
import { FindPublicFilesByKeysQuery } from "../../../storage/application/queries/find-public-files.query.js";
import { PostNotFoundError } from "../../domain/post.errors.js";
import { checkCanEdit } from "../../domain/post.js";
import {
  POST_REPOSITORY,
  type PostRepository,
} from "../../domain/post.repository.js";
import { checkPathFree } from "../post-path.js";
import { SetPostTranslationCommand } from "./set-post-translation.command.js";

@CommandHandler(SetPostTranslationCommand)
export class SetPostTranslationHandler
  implements ICommandHandler<SetPostTranslationCommand>
{
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    @Inject(HTML_SANITIZER) private readonly sanitizer: HtmlSanitizer,
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  async execute({
    postId,
    locale: code,
    text,
    actor,
  }: SetPostTranslationCommand): Promise<void> {
    const post = await this.posts.findById(postId);
    if (!post) {
      throw new PostNotFoundError();
    }
    checkCanEdit(actor, post);
    const locale = await findActiveLocale(this.queries, code);

    post.translate(locale, {
      ...text,
      content: this.sanitizer.sanitize(text.content),
    });
    await checkPathFree(post, this.posts, this.queries, locale.id);
    await this.posts.save(post);

    // Files used by any locale's content stay 'inline' usages of the post
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
