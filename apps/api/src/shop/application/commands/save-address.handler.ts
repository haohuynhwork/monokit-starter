import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { Address, type AddressFields } from "../../domain/address.js";
import { AddressNotFoundError } from "../../domain/shop.errors.js";
import {
  ADDRESS_REPOSITORY,
  type AddressRepository,
} from "../../domain/shop.repository.js";
import { loadAddressRules } from "../address-rules.js";
import { SaveAddressCommand } from "./save-address.command.js";

@CommandHandler(SaveAddressCommand)
export class SaveAddressHandler implements ICommandHandler<SaveAddressCommand> {
  constructor(
    @Inject(ADDRESS_REPOSITORY) private readonly addresses: AddressRepository,
    private readonly queries: QueryBus,
  ) {}

  async execute({
    userId,
    addressId,
    fields,
    isDefault,
  }: SaveAddressCommand): Promise<bigint> {
    let address: Address;
    if (addressId === null) {
      const rules = await loadAddressRules(this.queries, fields.regionCode);
      const first = !(await this.addresses.hasAny(userId));
      address = Address.create(
        userId,
        {
          label: null,
          line2: null,
          regionCode: null,
          region: null,
          postalCode: null,
          recipientName: "",
          phone: "",
          line1: "",
          city: "",
          countryCode: "",
          ...fields,
        } satisfies AddressFields,
        first || !!isDefault,
        rules,
      );
    } else {
      const found = await this.addresses.findById(addressId);
      // Someone else's address looks the same as a missing one
      if (!found?.isOwnedBy(userId)) {
        throw new AddressNotFoundError();
      }
      address = found;
      const current = found.snapshot();
      // Same as Address.update: a new country without a region drops it
      const countryChanged =
        !!fields.countryCode &&
        fields.countryCode.trim().toUpperCase() !== current.countryCode;
      const rules = await loadAddressRules(
        this.queries,
        fields.regionCode !== undefined
          ? fields.regionCode
          : countryChanged
            ? null
            : current.regionCode,
        current.regionCode,
      );
      // Unsetting the default leaves the user without one; that's allowed
      address.update(fields, rules, isDefault);
    }
    await this.addresses.save(address);
    return address.id!;
  }
}
