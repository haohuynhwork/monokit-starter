import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { checkLayoutSettings } from "../../domain/page-layout.js";
import { ListPageLayoutsQuery } from "./list-page-layouts.query.js";
import type { PageLayoutView } from "./page.view.js";

@QueryHandler(ListPageLayoutsQuery)
export class ListPageLayoutsHandler
  implements IQueryHandler<ListPageLayoutsQuery>
{
  constructor(@InjectDb() private readonly db: Db) {}

  async execute(): Promise<PageLayoutView[]> {
    const [layouts, pages] = await Promise.all([
      this.db.orm.public.PageLayout.select(
        "id",
        "name",
        "isDefault",
        "settings",
        "updatedAt",
      )
        .where((l) => l.deletedAt.isNull())
        .orderBy([
          (l) => l.name.asc(),
        ])
        .all(),
      this.db.orm.public.Page.select("layoutId")
        .where((p) => p.deletedAt.isNull())
        .all(),
    ]);
    const counts = new Map<bigint | null, number>();
    for (const { layoutId } of pages) {
      counts.set(layoutId, (counts.get(layoutId) ?? 0) + 1);
    }
    // Default first
    layouts.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
    return layouts.map((l) => ({
      id: String(l.id),
      name: l.name,
      isDefault: l.isDefault,
      settings: checkLayoutSettings(l.settings),
      pageCount:
        (counts.get(l.id) ?? 0) + (l.isDefault ? (counts.get(null) ?? 0) : 0),
      updatedAt: l.updatedAt,
    }));
  }
}
