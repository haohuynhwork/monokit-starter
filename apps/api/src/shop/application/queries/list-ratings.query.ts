import { Query } from "@nestjs/cqrs";
import type { RatingView } from "./shop.view.js";

export interface RatingPage {
  items: RatingView[];
  total: number;
}

// A product's ratings, newest first
export class ListRatingsQuery extends Query<RatingPage> {
  constructor(
    readonly productId: bigint,
    readonly limit: number,
    readonly offset: number,
  ) {
    super();
  }
}
