import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { Cart, type Sellable } from "../domain/cart.js";
import type { CartRepository } from "../domain/shop.repository.js";
import { variantNames } from "./prisma-order.repository.js";

@Injectable()
export class PrismaCartRepository implements CartRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async load(userId: bigint): Promise<Cart> {
    const rows = await this.db.orm.public.CartItem.select(
      "variantId",
      "quantity",
    )
      .where({
        userId,
      })
      .orderBy((c) => c.id.asc())
      .limit(500)
      .all();
    return Cart.restore(userId, rows);
  }

  async findSellable(variantIds: bigint[]): Promise<Sellable[]> {
    if (!variantIds.length) {
      return [];
    }
    const variants = await this.db.orm.public.ProductVariant.select(
      "id",
      "productId",
      "trackStock",
      "stock",
    )
      .where((v) => v.id.in(variantIds))
      .where((v) => v.deletedAt.isNull())
      .all();
    if (!variants.length) {
      return [];
    }
    const [products, names] = await Promise.all([
      this.db.orm.public.Product.select("id", "name", "status")
        .where((p) => p.id.in(variants.map((v) => v.productId)))
        .where((p) => p.deletedAt.isNull())
        .all(),
      variantNames(
        this.db,
        variants.map((v) => v.id),
      ),
    ]);
    const byId = new Map(
      products.map((p) => [
        p.id,
        p,
      ]),
    );
    return variants.flatMap((v) => {
      const p = byId.get(v.productId);
      if (!p) {
        return [];
      }
      const name = names.get(v.id);
      return [
        {
          variantId: v.id,
          label: name ? `${p.name} (${name})` : p.name,
          status: p.status,
          trackStock: v.trackStock,
          stock: v.stock,
        },
      ];
    });
  }

  // Keeps untouched rows (and so the order lines were added in)
  save(cart: Cart): Promise<void> {
    return this.db.transaction(async (tx) => {
      const old = await tx.orm.public.CartItem.select(
        "id",
        "variantId",
        "quantity",
      )
        .where({
          userId: cart.userId,
        })
        .forUpdate()
        .limit(500)
        .all();
      const lines = new Map(
        cart.snapshot().map((l) => [
          l.variantId,
          l.quantity,
        ]),
      );
      const gone = old.filter((r) => !lines.has(r.variantId)).map((r) => r.id);
      if (gone.length) {
        await tx.orm.public.CartItem.where((c) => c.id.in(gone)).deleteAll();
      }
      for (const row of old) {
        const quantity = lines.get(row.variantId);
        if (quantity !== undefined && quantity !== row.quantity) {
          await tx.orm.public.CartItem.where({
            id: row.id,
          }).update({
            quantity,
          });
        }
        lines.delete(row.variantId);
      }
      for (const [variantId, quantity] of lines) {
        await tx.orm.public.CartItem.create({
          userId: cart.userId,
          variantId,
          quantity,
        });
      }
    });
  }
}
