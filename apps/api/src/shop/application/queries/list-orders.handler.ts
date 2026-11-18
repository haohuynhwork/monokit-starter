import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import type { AddressFields } from "../../domain/address.js";
import { ListOrdersQuery, type OrderPage } from "./list-orders.query.js";
import { escapeLike } from "./shop.view.js";

@QueryHandler(ListOrdersQuery)
export class ListOrdersHandler implements IQueryHandler<ListOrdersQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({
    filter,
    limit,
    offset,
  }: ListOrdersQuery): Promise<OrderPage> {
    const ids = await this.matching(filter.q?.trim());
    if (ids?.length === 0) {
      return {
        items: [],
        total: 0,
      };
    }
    const orders = this.db.orm.public.Order.where((o) =>
      filter.userId ? o.userId.eq(filter.userId) : o.id.isNotNull(),
    )
      .where((o) =>
        filter.status ? o.status.eq(filter.status) : o.id.isNotNull(),
      )
      .where((o) => (ids ? o.id.in(ids) : o.id.isNotNull()));

    const [rows, { total }] = await Promise.all([
      orders
        .select(
          "id",
          "userId",
          "status",
          "paymentMethod",
          "paymentStatus",
          "currency",
          "total",
          "shippingAddress",
          "createdAt",
        )
        .orderBy([
          (o) => o.createdAt.desc(),
          (o) => o.id.desc(),
        ])
        .limit(limit)
        .offset(offset)
        .all(),
      orders.aggregate((a) => ({
        total: a.count(),
      })),
    ]);
    const counts = await this.itemCounts(rows.map((r) => r.id));
    return {
      items: rows.map(({ shippingAddress, ...r }) => ({
        ...r,
        id: String(r.id),
        userId: r.userId === null ? null : String(r.userId),
        total: String(r.total),
        itemCount: counts.get(String(r.id)) ?? 0,
        recipientName: (shippingAddress as unknown as AddressFields)
          .recipientName,
      })),
      total,
    };
  }

  // null: no search. The ORM has no JSON operators, so search with SQL.
  private async matching(q: string | undefined): Promise<bigint[] | null> {
    if (!q) {
      return null;
    }
    const number = /^#?(\d{1,18})$/.exec(q)?.[1];
    if (number) {
      return [
        BigInt(number),
      ];
    }
    const pattern = `%${escapeLike(q)}%`;
    const rows = await this.db.query(
      this.db.raw.sql`SELECT "id" FROM "public"."Order"
        WHERE "shippingAddress"->>'recipientName' ILIKE ${pattern}
           OR "shippingAddress"->>'phone' ILIKE ${pattern}
        ORDER BY "id" DESC LIMIT 1000`
        .returnsRow({
          id: "pg/int8@1",
        })
        .build(),
    );
    return rows.map((r) => BigInt(String(r.id)));
  }

  private async itemCounts(orderIds: bigint[]): Promise<Map<string, number>> {
    if (orderIds.length === 0) {
      return new Map();
    }
    const items = await this.db.orm.public.OrderItem.select(
      "orderId",
      "quantity",
    )
      .where((i) => i.orderId.in(orderIds))
      .all();
    const counts = new Map<string, number>();
    for (const i of items) {
      const key = String(i.orderId);
      counts.set(key, (counts.get(key) ?? 0) + i.quantity);
    }
    return counts;
  }
}
