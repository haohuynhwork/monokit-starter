import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ListWishlistIdsQuery } from "./list-wishlist-ids.query.js";

@QueryHandler(ListWishlistIdsQuery)
export class ListWishlistIdsHandler
  implements IQueryHandler<ListWishlistIdsQuery>
{
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ userId }: ListWishlistIdsQuery): Promise<string[]> {
    const rows = await this.db.orm.public.WishlistItem.select("productId")
      .where({
        userId,
      })
      .limit(1000)
      .all();
    return rows.map((r) => String(r.productId));
  }
}
