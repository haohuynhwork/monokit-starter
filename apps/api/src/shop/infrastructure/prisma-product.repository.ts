import { Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { sqlError } from "../../common/infrastructure/sql-error.js";
import {
  type GalleryItem,
  Product,
  type ProductOption,
} from "../domain/product.js";
import {
  InvalidShopInputError,
  ProductSlugTakenError,
  SkuTakenError,
} from "../domain/shop.errors.js";
import type { ProductRepository } from "../domain/shop.repository.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const FIELDS = [
  "id",
  "categoryId",
  "name",
  "slug",
  "description",
  "content",
  "saleStartsAt",
  "saleEndsAt",
  "status",
  "createdById",
  "deletedAt",
] as const;

const VARIANT_FIELDS = [
  "id",
  "sku",
  "listPrice",
  "salePrice",
  "trackStock",
  "stock",
  "deletedAt",
] as const;

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  // Live variants only; deleted ones stay as they are
  async findById(id: bigint): Promise<Product | null> {
    const row = await this.db.orm.public.Product.select(...FIELDS)
      .where({
        id,
      })
      .where((p) => p.deletedAt.isNull())
      .first();
    if (!row) {
      return null;
    }
    const options = await loadOptions(this.db, id);
    const variants = await this.db.orm.public.ProductVariant.select(
      ...VARIANT_FIELDS,
    )
      .where({
        productId: id,
      })
      .where((v) => v.deletedAt.isNull())
      .orderBy([
        (v) => v.position.asc(),
        (v) => v.id.asc(),
      ])
      .all();
    const links = variants.length
      ? await this.db.orm.public.ProductVariantValue.select(
          "variantId",
          "optionId",
          "valueId",
        )
          .where((l) => l.variantId.in(variants.map((v) => v.id)))
          .all()
      : [];
    const optionName = new Map(
      options.map((o) => [
        o.id,
        o.name,
      ]),
    );
    const valueText = new Map(
      options.flatMap((o) =>
        o.values.map((v) => [
          v.id,
          v.value,
        ]),
      ),
    );
    return Product.restore({
      ...row,
      options,
      variants: variants.map((v) => ({
        ...v,
        values: Object.fromEntries(
          links
            .filter((l) => l.variantId === v.id)
            .map((l) => [
              optionName.get(l.optionId)!,
              valueText.get(l.valueId)!,
            ]),
        ),
      })),
    });
  }

  async save(product: Product): Promise<void> {
    const { id, options, variants, ...props } = product.snapshot();
    const fields = {
      ...props,
      ...product.priceRange(),
    };
    try {
      await this.db.transaction(async (tx) => {
        let productId = id;
        if (productId === null) {
          const row = await tx.orm.public.Product.select("id").create(fields);
          productId = row.id;
        } else {
          await tx.orm.public.Product.where({
            id: productId,
          }).update(fields);
        }
        const ids = await saveOptions(tx, productId, options);
        for (const [position, v] of variants.entries()) {
          const { id: variantId, values, ...data } = v;
          if (variantId === null) {
            const row = await tx.orm.public.ProductVariant.select("id").create({
              ...data,
              productId,
              position,
            });
            v.id = row.id;
          } else {
            await tx.orm.public.ProductVariant.where({
              id: variantId,
            }).update({
              ...data,
              position,
            });
            await tx.orm.public.ProductVariantValue.where({
              variantId,
            }).deleteAll();
          }
          if (v.deletedAt !== null) {
            continue;
          }
          for (const o of options) {
            await tx.orm.public.ProductVariantValue.create({
              variantId: v.id!,
              optionId: o.id!,
              valueId: ids.get(`${o.name}\u0000${values[o.name]}`)!,
            });
          }
        }
        product.assignId(productId);
      });
    } catch (error) {
      const e = sqlError(error);
      if (e?.sqlState === "23505") {
        throw e.constraint?.startsWith("product_variants_sku")
          ? new SkuTakenError()
          : new ProductSlugTakenError();
      }
      throw error;
    }
  }

  async findGallery(productId: bigint): Promise<GalleryItem[]> {
    return this.db.orm.public.ProductGalleryItem.select(
      "assetId",
      "title",
      "description",
    )
      .where({
        productId,
      })
      .orderBy([
        (g) => g.position.asc(),
        (g) => g.id.asc(),
      ])
      .all();
  }

  async replaceGallery(productId: bigint, items: GalleryItem[]): Promise<void> {
    try {
      await this.db.transaction(async (tx) => {
        await tx.orm.public.ProductGalleryItem.where({
          productId,
        }).deleteAll();
        for (const [position, item] of items.entries()) {
          await tx.orm.public.ProductGalleryItem.create({
            ...item,
            productId,
            position,
          });
        }
      });
    } catch (error) {
      const e = sqlError(error);
      if (
        e?.sqlState === "23503" &&
        e.constraint === "ProductGalleryItem_assetId_fkey"
      ) {
        throw new InvalidShopInputError("A gallery image does not exist");
      }
      throw error;
    }
  }
}

async function loadOptions(
  db: Db | Tx,
  productId: bigint,
): Promise<ProductOption[]> {
  const options = await db.orm.public.ProductOption.select("id", "name")
    .where({
      productId,
    })
    .orderBy([
      (o) => o.position.asc(),
      (o) => o.id.asc(),
    ])
    .all();
  const values = options.length
    ? await db.orm.public.ProductOptionValue.select("id", "optionId", "value")
        .where((v) => v.optionId.in(options.map((o) => o.id)))
        .orderBy([
          (v) => v.position.asc(),
          (v) => v.id.asc(),
        ])
        .all()
    : [];
  return options.map((o) => ({
    id: o.id,
    name: o.name,
    values: values
      .filter((v) => v.optionId === o.id)
      .map((v) => ({
        id: v.id,
        value: v.value,
      })),
  }));
}

// Writes the options in order, assigns new ids and drops what is gone (its
// variant links go with it). Returns "name\0value" -> value id.
async function saveOptions(
  tx: Tx,
  productId: bigint,
  options: ProductOption[],
): Promise<Map<string, bigint>> {
  const current = await loadOptions(tx, productId);
  const ids = new Map<string, bigint>();
  for (const [position, o] of options.entries()) {
    if (o.id === null) {
      const row = await tx.orm.public.ProductOption.select("id").create({
        productId,
        name: o.name,
        position,
      });
      o.id = row.id;
    } else {
      await tx.orm.public.ProductOption.where({
        id: o.id,
      }).update({
        position,
      });
    }
    const old = current.find((c) => c.id === o.id);
    for (const gone of old?.values ?? []) {
      if (!o.values.some((v) => v.id === gone.id)) {
        await tx.orm.public.ProductOptionValue.where({
          id: gone.id!,
        }).delete();
      }
    }
    for (const [i, v] of o.values.entries()) {
      if (v.id === null) {
        const row = await tx.orm.public.ProductOptionValue.select("id").create({
          optionId: o.id,
          value: v.value,
          position: i,
        });
        v.id = row.id;
      } else {
        await tx.orm.public.ProductOptionValue.where({
          id: v.id,
        }).update({
          position: i,
        });
      }
      ids.set(`${o.name}\u0000${v.value}`, v.id);
    }
  }
  for (const gone of current) {
    if (!options.some((o) => o.id === gone.id)) {
      await tx.orm.public.ProductOption.where({
        id: gone.id!,
      }).delete();
    }
  }
  return ids;
}
