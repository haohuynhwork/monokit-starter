import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { checkRate } from "../../domain/currency.js";
import { loadBaseCurrency } from "../base-currency.js";
import { ListCurrenciesQuery } from "./list-currencies.query.js";
import type { CurrenciesView } from "./locale.view.js";

@QueryHandler(ListCurrenciesQuery)
export class ListCurrenciesHandler
  implements IQueryHandler<ListCurrenciesQuery>
{
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  async execute({ activeOnly }: ListCurrenciesQuery): Promise<CurrenciesView> {
    let q = this.db.orm.public.Currency.select(
      "id",
      "code",
      "name",
      "symbol",
      "decimals",
      "rate",
      "rateAt",
      "active",
      "position",
    );
    if (activeOnly) {
      q = q.where({
        active: true,
      });
    }
    const [base, rows] = await Promise.all([
      loadBaseCurrency(this.queries),
      q
        .orderBy([
          (c) => c.position.asc(),
          (c) => c.code.asc(),
        ])
        .limit(500)
        .all(),
    ]);
    return {
      base,
      items: rows.map((r) => ({
        ...r,
        id: String(r.id),
        // Numeric(20, 10) comes back padded: '26000.0000000000' -> '26000'
        rate: checkRate(String(r.rate)),
        isBase: r.code === base,
      })),
    };
  }
}
