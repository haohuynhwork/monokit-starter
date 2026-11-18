import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { FindRegionQuery, type RegionLookup } from "./find-region.query.js";

@QueryHandler(FindRegionQuery)
export class FindRegionHandler implements IQueryHandler<FindRegionQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ code }: FindRegionQuery): Promise<RegionLookup | null> {
    return this.db.orm.public.Region.select("countryCode", "name", "active")
      .where({
        code,
      })
      .first();
  }
}
