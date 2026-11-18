import { Command } from "@nestjs/cqrs";
import type { AddressFields } from "../../domain/address.js";

// Creates (addressId null) or edits one of the user's addresses; returns
// its id. The first address becomes the default.
export class SaveAddressCommand extends Command<bigint> {
  constructor(
    readonly userId: bigint,
    readonly addressId: bigint | null,
    readonly fields: Partial<AddressFields>,
    readonly isDefault?: boolean,
  ) {
    super();
  }
}
