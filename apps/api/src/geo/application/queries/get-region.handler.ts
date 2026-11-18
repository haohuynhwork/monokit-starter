import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { GetRegionQuery } from "./get-region.query.js";
import { type RegionView, toRegionView } from "./region.view.js";

@QueryHandler(GetRegionQuery)
export class GetRegionHandler implements IQueryHandler<GetRegionQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ regionId }: GetRegionQuery): Promise<RegionView | null> {
    const row = await this.db.orm.public.Region.select(
      "id",
      "countryCode",
      "parentId",
      "code",
      "name",
      "position",
      "active",
    )
      .where({
        id: regionId,
      })
      .first();
    return row ? toRegionView(row) : null;
  }
}
