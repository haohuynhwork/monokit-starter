import { Query } from "@nestjs/cqrs";
import type { ProductView } from "./shop.view.js";

// By id (panel) or slug (shop, active only), with its gallery
export class GetProductQuery extends Query<ProductView | null> {
  constructor(
    readonly by:
      | {
          id: bigint;
        }
      | {
          slug: string;
        },
    readonly activeOnly = false,
  ) {
    super();
  }
}
