import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { priceCart } from "./cart-pricing.js";
import { PriceCartQuery } from "./price-cart.query.js";
import type { CartView } from "./shop.view.js";

@QueryHandler(PriceCartQuery)
export class PriceCartHandler implements IQueryHandler<PriceCartQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  execute({ lines }: PriceCartQuery): Promise<CartView> {
    return priceCart(lines, this.db, this.queries);
  }
}
