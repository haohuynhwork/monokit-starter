import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { websearchToTsquery } from "@prisma/orm-postgres/target/full-text";
import {
  type ResolvedLocale,
  ResolveLocaleQuery,
} from "../../../geo/application/queries/resolve-locale.query.js";
import { GetAssetUsagesQuery } from "../../../storage/application/queries/get-asset-usages.query.js";
import { ResolveContentUrlsQuery } from "../../../storage/application/queries/resolve-content-urls.query.js";
import {
  CountPublicPostsQuery,
  ListPublicPostsQuery,
  type PublicPostFilter,
} from "./list-public-posts.query.js";
import { loadTags, type PublicPostView, postIdsWithTag } from "./post.view.js";

@QueryHandler(ListPublicPostsQuery)
export class ListPublicPostsHandler
  implements IQueryHandler<ListPublicPostsQuery>
{
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  async execute({
    limit,
    offset,
    tag,
    tagId,
    q,
    locale: tags,
  }: ListPublicPostsQuery): Promise<PublicPostView[]> {
    const locale = await this.queries.execute(new ResolveLocaleQuery(tags));
    const posts = await livePosts(this.db, {
      tag,
      tagId,
      q,
    });
    if (!posts) {
      return [];
    }
    const rows = await (q?.trim()
      ? posts
      : posts.orderBy([
          (p) => p.publishedAt.desc(),
          (p) => p.id.desc(),
        ])
    )
      .select("id", "title", "fullSlug", "description", "publishedAt")
      .limit(limit)
      .offset(offset)
      .all();
    return toPublic(
      await localize(
        rows.map((r) => ({
          ...r,
          content: "",
        })),
        this.db,
        locale,
        false,
      ),
      this.db,
      this.queries,
    );
  }
}

@QueryHandler(CountPublicPostsQuery)
export class CountPublicPostsHandler
  implements IQueryHandler<CountPublicPostsQuery>
{
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ filter }: CountPublicPostsQuery): Promise<number> {
    const posts = await livePosts(this.db, filter);
    if (!posts) {
      return 0;
    }
    const { total } = await posts.aggregate((a) => ({
      total: a.count(),
    }));
    return total;
  }
}

// Live posts matching the filter; null when a tag rules out every post
async function livePosts(db: Db, { tag, tagId, q }: PublicPostFilter) {
  const tagged = tag
    ? ((await postIdsWithTag(db, tag)) ?? [])
    : tagId
      ? (
          await db.orm.public.PostTagging.select("postId")
            .where({
              tagId,
            })
            .all()
        ).map((t) => t.postId)
      : null;
  if (tagged?.length === 0) {
    return null;
  }
  const base = db.orm.public.Post.where((p) => p.deletedAt.isNull())
    .where((p) => (tagged ? p.id.in(tagged) : p.id.isNotNull()))
    .where((p) => p.status.neq("draft"))
    .where((p) => p.publishedAt.lte(new Date().toISOString() as never));
  const search = q?.trim();
  return search ? base.using.posts_search(websearchToTsquery(search)) : base;
}

type PublicRow = {
  id: bigint;
  title: string;
  fullSlug: string | null;
  content: string;
  description: string | null;
  publishedAt: string | null;
};

// The rows' text in `locale` where they have a translation (ideas/i18n);
// the others keep the default text. `withContent`: lists leave bodies out.
export async function localize(
  rows: PublicRow[],
  db: Db,
  locale: ResolvedLocale,
  withContent: boolean,
): Promise<
  (PublicRow & {
    locale: string;
  })[]
> {
  const untranslated = rows.map((r) => ({
    ...r,
    locale: locale.defaultCode,
  }));
  if (locale.isDefault || !rows.length) {
    return untranslated;
  }
  const translations = await db.orm.public.PostTranslation.select(
    "postId",
    "title",
    "fullSlug",
    "content",
    "description",
  )
    .where({
      localeId: locale.id,
    })
    .where((t) => t.postId.in(rows.map((r) => r.id)))
    .all();
  const byPost = new Map(
    translations.map((t) => [
      t.postId,
      t,
    ]),
  );
  return untranslated.map((r) => {
    const t = byPost.get(r.id);
    return t
      ? {
          ...r,
          title: t.title,
          fullSlug: t.fullSlug ?? r.fullSlug,
          content: withContent ? t.content : r.content,
          description: t.description,
          locale: locale.code,
        }
      : r;
  });
}

// Covers and tags in one go for all rows
export async function toPublic(
  rows: (PublicRow & {
    locale: string;
  })[],
  db: Db,
  queries: QueryBus,
): Promise<PublicPostView[]> {
  const tags = await loadTags(
    db,
    rows.map((r) => r.id),
  );
  const covers = await queries.execute(
    new GetAssetUsagesQuery(
      "post",
      rows.map((r) => r.id),
      "cover",
    ),
  );
  const contents = await queries.execute(
    new ResolveContentUrlsQuery(rows.map((r) => r.content)),
  );
  return rows.flatMap((r, i) =>
    r.fullSlug === null || r.publishedAt === null
      ? []
      : [
          {
            title: r.title,
            path: r.fullSlug,
            content: contents[i]!,
            description: r.description,
            tags: tags.get(r.id) ?? [],
            publishedAt: r.publishedAt,
            coverUrl: covers.get(String(r.id))?.[0]?.url ?? null,
            locale: r.locale,
          },
        ],
  );
}
