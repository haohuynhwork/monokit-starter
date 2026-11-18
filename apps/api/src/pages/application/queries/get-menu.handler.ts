import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { GetMenuQuery } from "./get-menu.query.js";
import { isLive, type MenuItem } from "./page.view.js";

@QueryHandler(GetMenuQuery)
export class GetMenuHandler implements IQueryHandler<GetMenuQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute(): Promise<MenuItem[]> {
    const rows = await this.db.orm.public.Page.select(
      "id",
      "parentId",
      "title",
      "fullSlug",
      "status",
      "publishedAt",
      "showInMenu",
    )
      .where((p) => p.deletedAt.isNull())
      .orderBy([
        (p) => p.menuOrder.asc(),
        (p) => p.title.asc(),
      ])
      .all();
    const parentOf = new Map(
      rows.map((r) => [
        r.id,
        r.parentId,
      ]),
    );
    const shown = rows.filter((r) => r.showInMenu && r.fullSlug && isLive(r));
    const items = new Map<bigint, MenuItem>(
      shown.map((r) => [
        r.id,
        {
          title: r.title,
          path: r.fullSlug!,
          children: [],
        },
      ]),
    );
    const roots: MenuItem[] = [];
    for (const r of shown) {
      // Nearest ancestor that is in the menu
      let up = r.parentId;
      while (up !== null && !items.has(up)) {
        up = parentOf.get(up) ?? null;
      }
      (up === null ? roots : items.get(up)!.children).push(items.get(r.id)!);
    }
    return roots;
  }
}
