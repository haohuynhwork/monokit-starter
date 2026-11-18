import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ListLocalesQuery } from "../../../geo/application/queries/list-locales.query.js";
import { GetAssetUsagesQuery } from "../../../storage/application/queries/get-asset-usages.query.js";
import { GetPostQuery } from "./get-post.query.js";
import {
  loadTags,
  type PostView,
  SUMMARY_FIELDS,
  toSummary,
} from "./post.view.js";

@QueryHandler(GetPostQuery)
export class GetPostHandler implements IQueryHandler<GetPostQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  async execute({ postId }: GetPostQuery): Promise<PostView | null> {
    const row = await this.db.orm.public.Post.select(
      ...SUMMARY_FIELDS,
      "content",
    )
      .where({
        id: postId,
      })
      .where((p) => p.deletedAt.isNull())
      .first();
    if (!row) {
      return null;
    }
    const covers = await this.queries.execute(
      new GetAssetUsagesQuery(
        "post",
        [
          postId,
        ],
        "cover",
      ),
    );
    const cover = covers.get(String(postId))?.[0] ?? null;
    const tags = await loadTags(this.db, [
      postId,
    ]);
    const translations = await this.db.orm.public.PostTranslation.select(
      "localeId",
      "title",
      "slug",
      "fullSlug",
      "content",
      "description",
      "updatedAt",
    )
      .where({
        postId,
      })
      .limit(500)
      .all();
    const locales = await this.queries.execute(new ListLocalesQuery(false));
    const codeOf = new Map(
      locales.map((l) => [
        l.id,
        l.code,
      ]),
    );
    return {
      ...toSummary(row, tags.get(postId) ?? []),
      // As stored ('serve/<key>'): the panel's editor resolves it against
      // its base URL, and public responses get file URLs (toPublic)
      content: row.content,
      cover,
      translations: translations.map(({ localeId, fullSlug, ...t }) => ({
        ...t,
        locale: codeOf.get(String(localeId)) ?? String(localeId),
        path: fullSlug,
      })),
    };
  }
}
