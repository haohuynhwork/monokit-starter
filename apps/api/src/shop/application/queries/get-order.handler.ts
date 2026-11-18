import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import type { AddressFields } from "../../domain/address.js";
import type { BillingDetails } from "../../domain/order.js";
import { GetOrderQuery } from "./get-order.query.js";
import type { OrderView } from "./shop.view.js";

@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ orderId, userId }: GetOrderQuery): Promise<OrderView | null> {
    const order = await this.db.orm.public.Order.select(
      "id",
      "userId",
      "status",
      "paymentMethod",
      "paymentStatus",
      "paidAt",
      "currency",
      "subtotal",
      "shippingFee",
      "tax",
      "total",
      "shippingAddress",
      "billingAddress",
      "trackingNumber",
      "note",
      "createdAt",
      "updatedAt",
    )
      .where({
        id: orderId,
      })
      .first();
    if (!order || (userId !== undefined && order.userId !== userId)) {
      return null;
    }
    const [items, events] = await Promise.all([
      this.db.orm.public.OrderItem.select(
        "productId",
        "variantId",
        "variantName",
        "name",
        "sku",
        "listPrice",
        "unitPrice",
        "quantity",
      )
        .where({
          orderId,
        })
        .orderBy((i) => i.id.asc())
        .all(),
      this.db.orm.public.OrderEvent.select(
        "type",
        "data",
        "actorId",
        "createdAt",
      )
        .where({
          orderId,
        })
        .orderBy([
          (e) => e.createdAt.asc(),
          (e) => e.id.asc(),
        ])
        .all(),
    ]);
    return {
      ...order,
      id: String(order.id),
      userId: order.userId === null ? null : String(order.userId),
      subtotal: String(order.subtotal),
      shippingFee: String(order.shippingFee),
      tax: String(order.tax),
      total: String(order.total),
      shippingAddress: order.shippingAddress as unknown as AddressFields,
      billingAddress: order.billingAddress as unknown as BillingDetails | null,
      items: items.map((i) => ({
        productId: i.productId === null ? null : String(i.productId),
        variantId: i.variantId === null ? null : String(i.variantId),
        variantName: i.variantName,
        name: i.name,
        sku: i.sku,
        listPrice: String(i.listPrice),
        unitPrice: String(i.unitPrice),
        quantity: i.quantity,
        lineTotal: String(i.unitPrice * BigInt(i.quantity)),
      })),
      events: events.map((e) => ({
        type: e.type,
        data: e.data as Record<string, unknown>,
        actorId: e.actorId === null ? null : String(e.actorId),
        createdAt: e.createdAt,
      })),
    };
  }
}
