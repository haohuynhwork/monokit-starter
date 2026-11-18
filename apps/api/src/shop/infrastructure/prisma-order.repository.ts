import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import type { AddressFields } from "../domain/address.js";
import {
  type BillingDetails,
  Order,
  type ProductForSale,
} from "../domain/order.js";
import { OrderChangedError, OutOfStockError } from "../domain/shop.errors.js";
import type { OrderRepository } from "../domain/shop.repository.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export const ORDER_FIELDS = [
  "id",
  "userId",
  "status",
  "currency",
  "subtotal",
  "shippingFee",
  "tax",
  "total",
  "shippingAddress",
  "billingAddress",
  "trackingNumber",
  "paymentMethod",
  "paymentStatus",
  "paidAt",
  "note",
] as const;

@Injectable()
export class PrismaOrderRepository implements OrderRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async findById(id: bigint): Promise<Order | null> {
    const row = await this.db.orm.public.Order.select(...ORDER_FIELDS)
      .where({
        id,
      })
      .first();
    if (!row) {
      return null;
    }
    const items = await this.db.orm.public.OrderItem.select(
      "productId",
      "variantId",
      "name",
      "variantName",
      "sku",
      "listPrice",
      "unitPrice",
      "quantity",
    )
      .where({
        orderId: id,
      })
      .orderBy((i) => i.id.asc())
      .all();
    return Order.restore({
      ...row,
      // Orders placed before regionCode existed lack it
      shippingAddress: {
        regionCode: null,
        ...(row.shippingAddress as unknown as Omit<
          AddressFields,
          "regionCode"
        >),
      },
      billingAddress: row.billingAddress as unknown as BillingDetails | null,
      items,
    });
  }

  place(
    variantIds: bigint[],
    build: (products: ProductForSale[]) => Order,
  ): Promise<Order> {
    return this.db.transaction(async (tx) => {
      // Variants locked until commit, so two checkouts can't sell the same
      // stock
      const variants = await tx.orm.public.ProductVariant.select(
        "id",
        "productId",
        "sku",
        "listPrice",
        "salePrice",
        "trackStock",
        "stock",
      )
        .where((v) => v.id.in(variantIds))
        .where((v) => v.deletedAt.isNull())
        .orderBy((v) => v.id.asc())
        .forUpdate()
        .all();
      const parents = variants.length
        ? await tx.orm.public.Product.select(
            "id",
            "name",
            "saleStartsAt",
            "saleEndsAt",
            "status",
          )
            .where((p) => p.id.in(variants.map((v) => v.productId)))
            .where((p) => p.deletedAt.isNull())
            .all()
        : [];
      const names = await variantNames(
        tx,
        variants.map((v) => v.id),
      );
      const products: ProductForSale[] = variants.flatMap((v) => {
        const p = parents.find((x) => x.id === v.productId);
        return p
          ? [
              {
                ...v,
                variantId: v.id,
                name: p.name,
                variantName: names.get(v.id) ?? "",
                saleStartsAt: p.saleStartsAt,
                saleEndsAt: p.saleEndsAt,
                status: p.status,
              },
            ]
          : [];
      });
      const order = build(products);
      const { id: _, items, ...props } = order.snapshot();

      // Untracked variants keep their (ignored) stock number
      for (const item of items) {
        const tracked = products.find(
          (p) => p.variantId === item.variantId,
        )?.trackStock;
        if (!tracked) {
          continue;
        }
        const taken = await tx.execute(
          tx.raw
            .sql`UPDATE "public"."ProductVariant" SET "stock" = "stock" - ${item.quantity}
            WHERE "id" = ${item.variantId!} AND "trackStock" AND "stock" >= ${item.quantity}`
            .affectedCount()
            .build(),
        );
        if (!taken) {
          throw new OutOfStockError(`${item.name} is out of stock`);
        }
      }
      const row = await tx.orm.public.Order.select("id").create({
        ...props,
        shippingAddress: {
          ...props.shippingAddress,
        },
        billingAddress: props.billingAddress && {
          ...props.billingAddress,
        },
      });
      order.assignId(row.id);
      for (const item of items) {
        await tx.orm.public.OrderItem.create({
          ...item,
          orderId: row.id,
        });
      }
      await this.insertEvents(tx, order);
      return order;
    });
  }

  async save(order: Order): Promise<void> {
    const { id, items, ...props } = order.snapshot();
    await this.db.transaction(async (tx) => {
      const row = await tx.orm.public.Order.where({
        id: id!,
        status: order.loadedStatus!,
      })
        .select("id")
        .update({
          status: props.status,
          trackingNumber: props.trackingNumber,
          paymentStatus: props.paymentStatus,
          paidAt: props.paidAt,
        });
      if (!row) {
        throw new OrderChangedError();
      }
      if (order.restock) {
        for (const item of items) {
          if (item.variantId !== null) {
            await tx.execute(
              tx.raw
                .sql`UPDATE "public"."ProductVariant" SET "stock" = "stock" + ${item.quantity}
                WHERE "id" = ${item.variantId} AND "trackStock"`
                .affectedCount()
                .build(),
            );
          }
        }
      }
      await this.insertEvents(tx, order);
    });
  }

  async hasDelivered(userId: bigint, productId: bigint): Promise<boolean> {
    const rows = await this.db.query(
      this.db.raw.sql`SELECT 1 AS "one" FROM "public"."OrderItem" i
        JOIN "public"."Order" o ON o."id" = i."orderId"
        WHERE o."userId" = ${userId} AND o."status" = 'delivered'
          AND i."productId" = ${productId}
        LIMIT 1`
        .returnsRow({
          one: "pg/int4@1",
        })
        .build(),
    );
    return rows.length > 0;
  }

  private async insertEvents(tx: Tx, order: Order): Promise<void> {
    for (const event of order.takeEvents()) {
      await tx.orm.public.OrderEvent.create({
        ...event,
        orderId: order.id!,
      });
    }
  }
}

// "M / Red" per variant, in option order; '' without options
export async function variantNames(
  db: Db | Tx,
  variantIds: bigint[],
): Promise<Map<bigint, string>> {
  if (!variantIds.length) {
    return new Map();
  }
  const links = await db.orm.public.ProductVariantValue.select(
    "variantId",
    "optionId",
    "valueId",
  )
    .where((l) => l.variantId.in(variantIds))
    .all();
  if (!links.length) {
    return new Map();
  }
  const [options, values] = await Promise.all([
    db.orm.public.ProductOption.select("id", "position")
      .where((o) =>
        o.id.in([
          ...new Set(links.map((l) => l.optionId)),
        ]),
      )
      .all(),
    db.orm.public.ProductOptionValue.select("id", "value")
      .where((v) =>
        v.id.in([
          ...new Set(links.map((l) => l.valueId)),
        ]),
      )
      .all(),
  ]);
  const position = (id: bigint) => {
    const o = options.find((x) => x.id === id)!;
    return [
      o.position,
      o.id,
    ] as const;
  };
  const names = new Map<bigint, string>();
  for (const id of variantIds) {
    const parts = links
      .filter((l) => l.variantId === id)
      .sort((x, y) => {
        const [pa, ia] = position(x.optionId);
        const [pb, ib] = position(y.optionId);
        return pa - pb || (ia < ib ? -1 : 1);
      })
      .map((l) => values.find((v) => v.id === l.valueId)!.value);
    if (parts.length) {
      names.set(id, parts.join(" / "));
    }
  }
  return names;
}
