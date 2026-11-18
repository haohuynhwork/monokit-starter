import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ListLocalesQuery } from "../../../geo/application/queries/list-locales.query.js";
import { ResolveLocaleQuery } from "../../../geo/application/queries/resolve-locale.query.js";
import { GetPublicPostQuery } from "./get-public-post.query.js";
import { localize, toPublic } from "./list-public-posts.handler.js";
import type { Alternate, PublicPostView } from "./post.view.js";

@QueryHandler(GetPublicPostQuery)
export class GetPublicPostHandler implements IQueryHandler<GetPublicPostQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  async execute({
    path,
    locale: tags,
  }: GetPublicPostQuery): Promise<PublicPostView | null> {
    const locale = await this.queries.execute(new ResolveLocaleQuery(tags));
    // The path in the locale first; else the default path, so an
    // untranslated post (or an old link) still opens
    const translated = locale.isDefault
      ? null
      : await this.db.orm.public.PostTranslation.select("postId")
          .where({
            localeId: locale.id,
          })
          .where((t) => t.fullSlug.eq(path as never))
          .first();
    const live = this.db.orm.public.Post.select(
      "id",
      "title",
      "fullSlug",
      "content",
      "description",
      "publishedAt",
    )
      .where((p) => p.deletedAt.isNull())
      .where((p) => p.status.neq("draft"))
      .where((p) => p.publishedAt.lte(new Date().toISOString() as never));
    const row = await (translated
      ? live.where({
          id: translated.postId,
        })
      : live.where((p) => p.fullSlug.eq(path as never))
    ).first();
    if (!row) {
      return null;
    }
    const [post] = await toPublic(
      await localize(
        [
          row,
        ],
        this.db,
        locale,
        true,
      ),
      this.db,
      this.queries,
    );
    if (!post) {
      return null;
    }
    return {
      ...post,
      alternates: await this.alternates(
        row.id,
        row.fullSlug!,
        locale.defaultCode,
      ),
    };
  }

  // The default path, then each active locale's translated path
  private async alternates(
    postId: bigint,
    defaultPath: string,
    defaultCode: string,
  ): Promise<Alternate[]> {
    const [translations, locales] = await Promise.all([
      this.db.orm.public.PostTranslation.select("localeId", "fullSlug")
        .where({
          postId,
        })
        .limit(500)
        .all(),
      this.queries.execute(new ListLocalesQuery(true)),
    ]);
    const codeOf = new Map(
      locales.map((l) => [
        l.id,
        l.code,
      ]),
    );
    return [
      {
        locale: defaultCode,
        path: defaultPath,
      },
      ...translations.flatMap((t) => {
        const code = codeOf.get(String(t.localeId));
        return code && t.fullSlug
          ? [
              {
                locale: code,
                path: t.fullSlug,
              },
            ]
          : [];
      }),
    ];
  }
}
