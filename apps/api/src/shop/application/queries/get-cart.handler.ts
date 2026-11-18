import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { priceCart } from "./cart-pricing.js";
import { GetCartQuery } from "./get-cart.query.js";
import type { CartView } from "./shop.view.js";

@QueryHandler(GetCartQuery)
export class GetCartHandler implements IQueryHandler<GetCartQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  async execute({ userId }: GetCartQuery): Promise<CartView> {
    const lines = await this.db.orm.public.CartItem.select(
      "variantId",
      "quantity",
    )
      .where({
        userId,
      })
      .orderBy((c) => c.id.asc())
      .limit(500)
      .all();
    return priceCart(lines, this.db, this.queries);
  }
}
