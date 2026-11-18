import { Query } from "@nestjs/cqrs";
import type { AddressView } from "./shop.view.js";

// The user's live addresses, default first
export class ListAddressesQuery extends Query<AddressView[]> {
  constructor(readonly userId: bigint) {
    super();
  }
}
