import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { AddressNotFoundError } from "../../domain/shop.errors.js";
import {
  ADDRESS_REPOSITORY,
  type AddressRepository,
} from "../../domain/shop.repository.js";
import { DeleteAddressCommand } from "./delete-address.command.js";

@CommandHandler(DeleteAddressCommand)
export class DeleteAddressHandler
  implements ICommandHandler<DeleteAddressCommand>
{
  constructor(
    @Inject(ADDRESS_REPOSITORY) private readonly addresses: AddressRepository,
  ) {}

  async execute({ userId, addressId }: DeleteAddressCommand): Promise<void> {
    const address = await this.addresses.findById(addressId);
    if (!address?.isOwnedBy(userId)) {
      throw new AddressNotFoundError();
    }
    address.delete(new Date());
    await this.addresses.save(address);
  }
}
