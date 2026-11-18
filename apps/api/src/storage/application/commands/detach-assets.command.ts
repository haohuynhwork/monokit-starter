import { Command } from "@nestjs/cqrs";

// Removes an owner's asset usages (one slot, or all when deleting the
// owner); returns the detached asset ids. The assets themselves stay.
export class DetachAssetsCommand extends Command<bigint[]> {
  constructor(
    readonly ownerType: string,
    readonly ownerId: bigint,
    readonly slot?: string,
  ) {
    super();
  }
}
