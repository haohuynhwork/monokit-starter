import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ListWishlistQuery } from "./list-wishlist.query.js";
import type { ProductView } from "./shop.view.js";
import { wishlistProducts } from "./wishlist-products.js";

@QueryHandler(ListWishlistQuery)
export class ListWishlistHandler implements IQueryHandler<ListWishlistQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  async execute({ userId }: ListWishlistQuery): Promise<ProductView[]> {
    const saved = await this.db.orm.public.WishlistItem.select("productId")
      .where({
        userId,
      })
      .orderBy((w) => w.createdAt.desc())
      .limit(200)
      .all();
    return wishlistProducts(
      saved.map((s) => s.productId),
      this.db,
      this.queries,
    );
  }
}
