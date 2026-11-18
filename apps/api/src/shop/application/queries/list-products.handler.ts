import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { and, or } from "@prisma/orm-postgres/orm-client";
import { ListProductsQuery, type ProductPage } from "./list-products.query.js";
import { escapeLike, PRODUCT_FIELDS, toProductViews } from "./shop.view.js";

@QueryHandler(ListProductsQuery)
export class ListProductsHandler implements IQueryHandler<ListProductsQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  async execute({
    filter,
    sort,
    limit,
    offset,
  }: ListProductsQuery): Promise<ProductPage> {
    const q = filter.q?.trim();
    if (sort === "price_asc" || sort === "price_desc") {
      return this.byPrice(
        {
          ...filter,
          q,
        },
        sort,
        limit,
        offset,
      );
    }
    const products = this.db.orm.public.Product.where((p) =>
      p.deletedAt.isNull(),
    )
      .where((p) =>
        filter.status ? p.status.eq(filter.status) : p.id.isNotNull(),
      )
      .where((p) =>
        filter.categoryId
          ? p.categoryId.eq(filter.categoryId)
          : p.id.isNotNull(),
      )
      .where((p) => {
        if (!q) {
          return p.id.isNotNull();
        }
        const pattern = `%${escapeLike(q)}%`;
        return or(
          p.name.ilike(pattern),
          p.variants.some((v) =>
            and(v.sku.ilike(pattern), v.deletedAt.isNull()),
          ),
        );
      });
    const ordered =
      sort === "name"
        ? products.orderBy([
            (p) => p.name.asc(),
            (p) => p.id.desc(),
          ])
        : products.orderBy([
            (p) => p.createdAt.desc(),
            (p) => p.id.desc(),
          ]);

    const [rows, { total }] = await Promise.all([
      ordered
        .select(...PRODUCT_FIELDS)
        .limit(limit)
        .offset(offset)
        .all(),
      products.aggregate((a) => ({
        total: a.count(),
      })),
    ]);
    return {
      items: await toProductViews(rows, this.db, this.queries),
      total,
    };
  }

  // By the lowest price a variant costs now (sale inside the product's
  // window, else list). The ORM can't order by that, so raw SQL picks the
  // page's ids with the same filters, then the ORM loads them.
  private async byPrice(
    filter: ListProductsQuery["filter"],
    sort: "price_asc" | "price_desc",
    limit: number,
    offset: number,
  ): Promise<ProductPage> {
    // Raw SQL takes no null parameters: '' and 0 stand for "any"
    const pattern = filter.q ? `%${escapeLike(filter.q)}%` : "";
    const status: string = filter.status ?? "";
    const categoryId = filter.categoryId ?? 0n;
    // 1 or -1, so one statement serves both directions
    const dir = sort === "price_asc" ? 1 : -1;
    const rows = await this.db.query(
      this.db.raw.sql`SELECT p."id", count(*) OVER () AS "total"
        FROM "public"."Product" p
        WHERE p."deletedAt" IS NULL
          AND (${status}::text = '' OR p."status" = ${status}::text)
          AND (${categoryId}::int8 = 0 OR p."categoryId" = ${categoryId}::int8)
          AND (${pattern}::text = '' OR p."name" ILIKE ${pattern}::text
               OR EXISTS (SELECT 1 FROM "public"."ProductVariant" v
                 WHERE v."productId" = p."id" AND v."deletedAt" IS NULL
                   AND v."sku" ILIKE ${pattern}::text))
        ORDER BY (SELECT min(CASE
              WHEN v."salePrice" IS NOT NULL
                AND (p."saleStartsAt" IS NULL OR p."saleStartsAt" <= now())
                AND (p."saleEndsAt" IS NULL OR p."saleEndsAt" > now())
              THEN v."salePrice" ELSE v."listPrice" END)
            FROM "public"."ProductVariant" v
            WHERE v."productId" = p."id" AND v."deletedAt" IS NULL
          ) * ${dir}::int8,
          p."id" DESC
        LIMIT ${limit} OFFSET ${offset}`
        .returnsRow({
          id: "pg/int8@1",
          total: "pg/int8@1",
        })
        .build(),
    );
    const ids = rows.map((r) => BigInt(String(r.id)));
    const total = rows.length ? Number(rows[0].total) : 0;
    const found = ids.length
      ? await this.db.orm.public.Product.where((p) => p.id.in(ids))
          .select(...PRODUCT_FIELDS)
          .all()
      : [];
    const byId = new Map(
      found.map((r) => [
        r.id,
        r,
      ]),
    );
    const ordered = ids.flatMap((id) => byId.get(id) ?? []);
    return {
      items: await toProductViews(ordered, this.db, this.queries),
      total,
    };
  }
}
