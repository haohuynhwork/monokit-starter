import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ListGuestWishlistQuery } from "./list-guest-wishlist.query.js";
import type { ProductView } from "./shop.view.js";
import { wishlistProducts } from "./wishlist-products.js";

@QueryHandler(ListGuestWishlistQuery)
export class ListGuestWishlistHandler
  implements IQueryHandler<ListGuestWishlistQuery>
{
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  execute({ productIds }: ListGuestWishlistQuery): Promise<ProductView[]> {
    return wishlistProducts(productIds, this.db, this.queries, true);
  }
}
