import { Command } from "@nestjs/cqrs";

// Removes these variants from the user's cart; null empties it
export class RemoveFromCartCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly variantIds: bigint[] | null,
  ) {
    super();
  }
}
