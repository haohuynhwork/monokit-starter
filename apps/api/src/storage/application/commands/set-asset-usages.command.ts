import { Command } from "@nestjs/cqrs";

// Makes a list slot hold exactly these assets, in this order (e.g. a post's
// inline images after saving its body). Returns the assets removed from it.
export class SetAssetUsagesCommand extends Command<bigint[]> {
  constructor(
    readonly ownerType: string,
    readonly ownerId: bigint,
    readonly slot: string,
    readonly assetIds: bigint[],
  ) {
    super();
  }
}
