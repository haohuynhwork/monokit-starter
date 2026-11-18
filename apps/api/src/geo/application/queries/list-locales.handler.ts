import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ListLocalesQuery } from "./list-locales.query.js";
import type { LocaleView } from "./locale.view.js";

@QueryHandler(ListLocalesQuery)
export class ListLocalesHandler implements IQueryHandler<ListLocalesQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ activeOnly }: ListLocalesQuery): Promise<LocaleView[]> {
    let q = this.db.orm.public.Locale.select(
      "id",
      "code",
      "name",
      "nativeName",
      "rtl",
      "active",
      "isDefault",
      "position",
    );
    if (activeOnly) {
      q = q.where({
        active: true,
      });
    }
    const rows = await q
      .orderBy([
        (l) => l.position.asc(),
        (l) => l.name.asc(),
      ])
      .limit(500)
      .all();
    // Default first (booleans can't be ordered in the query)
    return rows
      .map((r) => ({
        ...r,
        id: String(r.id),
      }))
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  }
}
