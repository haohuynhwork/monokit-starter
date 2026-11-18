import { Command } from "@nestjs/cqrs";

// Uses an asset in an owner's slot (ideas/storage). Returns the assets a
// single slot replaced, which the caller may delete.
export class AttachAssetCommand extends Command<bigint[]> {
  constructor(
    readonly ownerType: string,
    readonly ownerId: bigint,
    readonly slot: string,
    readonly assetId: bigint,
    readonly position = 0,
  ) {
    super();
  }
}
