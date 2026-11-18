import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { InvalidAssetSlotError } from "../../domain/asset.errors.js";
import { checkAssetSlot } from "../../domain/asset-slots.js";
import {
  ASSET_USAGE_REPOSITORY,
  type AssetUsageRepository,
} from "../../domain/asset-usage.repository.js";
import { SetAssetUsagesCommand } from "./set-asset-usages.command.js";

@CommandHandler(SetAssetUsagesCommand)
export class SetAssetUsagesHandler
  implements ICommandHandler<SetAssetUsagesCommand>
{
  constructor(
    @Inject(ASSET_USAGE_REPOSITORY)
    private readonly usages: AssetUsageRepository,
  ) {}

  execute(command: SetAssetUsagesCommand): Promise<bigint[]> {
    const { single } = checkAssetSlot(command.ownerType, command.slot);
    if (single) {
      // Single slots go through AttachAssetCommand
      throw new InvalidAssetSlotError(command.ownerType, command.slot);
    }
    return this.usages.replace(
      {
        ownerType: command.ownerType,
        ownerId: command.ownerId,
        slot: command.slot,
      },
      [
        ...new Set(command.assetIds),
      ],
    );
  }
}
