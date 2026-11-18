import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { websearchToTsquery } from "@prisma/orm-postgres/target/full-text";
import { ListPostsQuery, type PostPage } from "./list-posts.query.js";
import {
  loadTags,
  postIdsWithTag,
  SUMMARY_FIELDS,
  toSummary,
} from "./post.view.js";

@QueryHandler(ListPostsQuery)
export class ListPostsHandler implements IQueryHandler<ListPostsQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ filter, limit, offset }: ListPostsQuery): Promise<PostPage> {
    const { status } = filter;
    const q = filter.q?.trim();
    // A tag slug, e.g. 'new-york'
    const tagged = filter.tag
      ? ((await postIdsWithTag(this.db, filter.tag)) ?? [])
      : null;
    if (tagged?.length === 0) {
      return {
        items: [],
        total: 0,
      };
    }
    const base = this.db.orm.public.Post.where((p) => p.deletedAt.isNull())
      .where((p) => (status ? p.status.eq(status) : p.id.isNotNull()))
      .where((p) => (tagged ? p.id.in(tagged) : p.id.isNotNull()));
    const posts = q ? base.using.posts_search(websearchToTsquery(q)) : base;

    const [rows, { total }] = await Promise.all([
      (q
        ? posts
        : posts.orderBy([
            (p) => p.updatedAt.desc(),
            (p) => p.id.desc(),
          ])
      )
        .select(...SUMMARY_FIELDS)
        .limit(limit)
        .offset(offset)
        .all(),
      posts.aggregate((a) => ({
        total: a.count(),
      })),
    ]);
    const tags = await loadTags(
      this.db,
      rows.map((r) => r.id),
    );
    return {
      items: rows.map((r) => toSummary(r, tags.get(r.id) ?? [])),
      total,
    };
  }
}
