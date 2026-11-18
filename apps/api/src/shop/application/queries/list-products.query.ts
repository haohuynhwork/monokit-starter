import { Query } from "@nestjs/cqrs";
import type { ProductStatus } from "../../domain/product.js";
import type { ProductView } from "./shop.view.js";

export type ProductSort = "newest" | "price_asc" | "price_desc" | "name";

export interface ProductPage {
  items: ProductView[];
  total: number;
}

// Panel (any status) and shop (status 'active') listings
export class ListProductsQuery extends Query<ProductPage> {
  constructor(
    readonly filter: {
      status?: ProductStatus;
      q?: string;
      categoryId?: bigint;
    },
    readonly sort: ProductSort,
    readonly limit: number,
    readonly offset: number,
  ) {
    super();
  }
}
