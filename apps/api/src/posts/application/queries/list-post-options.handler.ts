import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import {
  ListPostOptionsQuery,
  type PostOption,
} from "./list-post-options.query.js";

@QueryHandler(ListPostOptionsQuery)
export class ListPostOptionsHandler
  implements IQueryHandler<ListPostOptionsQuery>
{
  constructor(@InjectDb() private readonly db: Db) {}

  async execute(): Promise<PostOption[]> {
    const rows = await this.db.orm.public.Post.select("id", "title", "fullSlug")
      .where((p) => p.deletedAt.isNull())
      .orderBy([
        (p) =>
          p.fullSlug.asc({
            nulls: "last",
          }),
        (p) => p.title.asc(),
      ])
      .limit(1000)
      .all();
    return rows.map((r) => ({
      id: String(r.id),
      title: r.title,
      path: r.fullSlug,
    }));
  }
}
