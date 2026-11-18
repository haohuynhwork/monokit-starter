import { Query } from "@nestjs/cqrs";

// Just the ids of the user's saved products, to mark them in listings
export class ListWishlistIdsQuery extends Query<string[]> {
  constructor(readonly userId: bigint) {
    super();
  }
}
