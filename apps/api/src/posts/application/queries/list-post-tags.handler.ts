import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ListPostTagsQuery, type PostTagView } from "./list-post-tags.query.js";

const TEXT = "pg/text@1";
const INT8 = "pg/int8@1";

@QueryHandler(ListPostTagsQuery)
export class ListPostTagsHandler implements IQueryHandler<ListPostTagsQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ filter }: ListPostTagsQuery): Promise<PostTagView[]> {
    const live = filter.live;
    const q = filter.q?.trim() ?? "";
    // Counts are never stored (ideas/posts/tags.md)
    const rows = await this.db.query(
      this.db.raw
        .sql`SELECT t."id", t."name", t."slug", count(p."id") AS "postCount"
        FROM "public"."PostTag" t
        LEFT JOIN "public"."PostTagging" g ON g."tagId" = t."id"
        LEFT JOIN "public"."Post" p ON p."id" = g."postId"
          AND p."deletedAt" IS NULL
          AND (NOT ${live}::bool
            OR (p."status" <> 'draft' AND p."publishedAt" <= now()))
        WHERE (${q}::text = '' OR t."name" ILIKE '%' || ${q}::text || '%')
        GROUP BY t."id"
        HAVING NOT ${live}::bool OR count(p."id") > 0
        ORDER BY lower(t."name"), t."id"
        LIMIT 500`
        .returnsRow({
          id: INT8,
          name: TEXT,
          slug: TEXT,
          postCount: INT8,
        })
        .build(),
    );
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      slug: String(r.slug),
      postCount: Number(r.postCount),
    }));
  }
}
