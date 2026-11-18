import { Logger } from "@nestjs/common";
import type { CommandBus, QueryBus } from "@nestjs/cqrs";
import { CreateCategoryCommand } from "../shop/application/commands/create-category.command.js";
import { CreateProductCommand } from "../shop/application/commands/create-product.command.js";
import { ListCategoriesQuery } from "../shop/application/queries/list-categories.query.js";
import {
  CategorySlugTakenError,
  ProductSlugTakenError,
} from "../shop/domain/shop.errors.js";
import type { Actor } from "../shop/domain/shop.js";
import { ADMIN_PERMISSIONS } from "../users/domain/permissions.js";

// Seeding acts as an admin; actor ids aren't stored for these writes
const SYSTEM: Actor = {
  id: 0n,
  permissions: ADMIN_PERMISSIONS,
};

const CATEGORIES = [
  {
    name: "Clothes",
    slug: "clothes",
  },
  {
    name: "Books",
    slug: "books",
  },
];

// price in cents
const PRODUCTS = [
  {
    category: "clothes",
    name: "Plain T-shirt",
    slug: "plain-t-shirt",
    options: [
      {
        name: "Size",
        values: [
          "S",
          "M",
          "L",
        ],
      },
    ],
    variants: [
      "S",
      "M",
      "L",
    ].map((size) => ({
      sku: `TSHIRT-${size}`,
      listPrice: size === "L" ? 1700n : 1500n,
      trackStock: true,
      stock: 20,
      values: {
        Size: size,
      },
    })),
  },
  {
    category: "clothes",
    name: "Hoodie",
    slug: "hoodie",
    variants: [
      {
        listPrice: 4500n,
        trackStock: true,
        stock: 20,
      },
    ],
  },
  {
    category: "books",
    name: "Field Guide",
    slug: "field-guide",
    variants: [
      {
        listPrice: 2500n,
      },
    ],
  },
];

// Idempotent: existing slugs are left alone
export async function seedShop(
  commands: CommandBus,
  queries: QueryBus,
): Promise<void> {
  const logger = new Logger("SeedShop");
  for (const c of CATEGORIES) {
    try {
      await commands.execute(
        new CreateCategoryCommand(
          {
            ...c,
            parentId: null,
          },
          SYSTEM,
        ),
      );
      logger.log(`Created category ${c.slug}`);
    } catch (error) {
      if (!(error instanceof CategorySlugTakenError)) {
        throw error;
      }
    }
  }
  const categories = await queries.execute(new ListCategoriesQuery());
  for (const { category, ...p } of PRODUCTS) {
    const categoryId = categories.find((c) => c.slug === category)?.id;
    try {
      await commands.execute(
        new CreateProductCommand(
          {
            ...p,
            categoryId: categoryId ? BigInt(categoryId) : null,
            status: "active",
          },
          SYSTEM,
        ),
      );
      logger.log(`Created product ${p.slug}`);
    } catch (error) {
      if (!(error instanceof ProductSlugTakenError)) {
        throw error;
      }
    }
  }
}
