import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ListCategoriesQuery } from "./list-categories.query.js";
import type { CategoryView } from "./shop.view.js";

@QueryHandler(ListCategoriesQuery)
export class ListCategoriesHandler
  implements IQueryHandler<ListCategoriesQuery>
{
  constructor(@InjectDb() private readonly db: Db) {}

  async execute(): Promise<CategoryView[]> {
    const rows = await this.db.orm.public.ProductCategory.select(
      "id",
      "parentId",
      "name",
      "slug",
      "position",
    )
      .where((c) => c.deletedAt.isNull())
      .orderBy([
        (c) => c.position.asc(),
        (c) => c.name.asc(),
      ])
      .limit(5000)
      .all();
    return rows.map((r) => ({
      id: String(r.id),
      parentId: r.parentId === null ? null : String(r.parentId),
      name: r.name,
      slug: r.slug,
      position: r.position,
    }));
  }
}
