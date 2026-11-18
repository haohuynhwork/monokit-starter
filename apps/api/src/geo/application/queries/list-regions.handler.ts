import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ListRegionsQuery } from "./list-regions.query.js";
import { type RegionView, toRegionView } from "./region.view.js";

@QueryHandler(ListRegionsQuery)
export class ListRegionsHandler implements IQueryHandler<ListRegionsQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ filter }: ListRegionsQuery): Promise<RegionView[]> {
    const { countryCode, parentId, activeOnly } = filter;
    let q = this.db.orm.public.Region.select(
      "id",
      "countryCode",
      "parentId",
      "code",
      "name",
      "position",
      "active",
    ).where({
      countryCode,
    });
    if (parentId !== undefined) {
      q = q.where((r) =>
        parentId === null ? r.parentId.isNull() : r.parentId.eq(parentId),
      );
    }
    if (activeOnly) {
      q = q.where({
        active: true,
      });
    }
    const rows = await q
      .orderBy([
        (r) => r.position.asc(),
        (r) => r.name.asc(),
      ])
      .limit(20000)
      .all();
    return rows.map(toRegionView);
  }
}
