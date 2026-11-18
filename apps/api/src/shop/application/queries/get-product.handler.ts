import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ResolveContentUrlsQuery } from "../../../storage/application/queries/resolve-content-urls.query.js";
import { GetProductQuery } from "./get-product.query.js";
import {
  PRODUCT_FIELDS,
  type ProductView,
  toProductViews,
} from "./shop.view.js";

@QueryHandler(GetProductQuery)
export class GetProductHandler implements IQueryHandler<GetProductQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  async execute({
    by,
    activeOnly,
  }: GetProductQuery): Promise<ProductView | null> {
    const row = await this.db.orm.public.Product.select(
      ...PRODUCT_FIELDS,
      "content",
    )
      .where(
        "id" in by
          ? {
              id: by.id,
            }
          : {
              slug: by.slug,
            },
      )
      .where((p) => p.deletedAt.isNull())
      .where((p) => (activeOnly ? p.status.eq("active") : p.id.isNotNull()))
      .first();
    if (!row) {
      return null;
    }
    const [view] = await toProductViews(
      [
        row,
      ],
      this.db,
      this.queries,
      true,
    );
    return {
      ...view!,
      // The shop gets file URLs; the panel's editor gets it as stored
      // ('serve/<key>') and resolves it against its base URL
      content: activeOnly
        ? (
            await this.queries.execute(
              new ResolveContentUrlsQuery([
                row.content,
              ]),
            )
          )[0]!
        : row.content,
    };
  }
}
