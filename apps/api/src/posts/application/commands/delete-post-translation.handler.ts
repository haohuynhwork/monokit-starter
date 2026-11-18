import { Inject } from "@nestjs/common";
import {
  CommandBus,
  CommandHandler,
  type ICommandHandler,
  QueryBus,
} from "@nestjs/cqrs";
import {
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
import { DeletePostTranslationCommand } from "./delete-post-translation.command.js";

@CommandHandler(DeletePostTranslationCommand)
export class DeletePostTranslationHandler
  implements ICommandHandler<DeletePostTranslationCommand>
{
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepository,
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  async execute({
    postId,
    locale: code,
    actor,
  }: DeletePostTranslationCommand): Promise<void> {
    const post = await this.posts.findById(postId);
    if (!post) {
      throw new PostNotFoundError();
    }
    checkCanEdit(actor, post);
    const locale = await findActiveLocale(this.queries, code);
    if (!post.translation(locale.id)) {
      return;
    }
    post.removeTranslation(locale.id);
    await this.posts.save(post);
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
