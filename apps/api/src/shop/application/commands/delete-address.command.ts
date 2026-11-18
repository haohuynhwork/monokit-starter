import { Command } from "@nestjs/cqrs";

// Soft delete; orders keep their copy
export class DeleteAddressCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly addressId: bigint,
  ) {
    super();
  }
}
