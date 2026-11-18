import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { HasPrivateAssetUsagesQuery } from "./has-private-asset-usages.query.js";

@QueryHandler(HasPrivateAssetUsagesQuery)
export class HasPrivateAssetUsagesHandler
  implements IQueryHandler<HasPrivateAssetUsagesQuery>
{
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({
    ownerType,
    ownerId,
  }: HasPrivateAssetUsagesQuery): Promise<boolean> {
    const row = await this.db.orm.public.AssetUsage.select("id")
      .where({
        ownerType,
        ownerId,
      })
      .where((t) => t.asset.some((a) => a.visibility.eq("private")))
      .first();
    return row !== null;
  }
}
