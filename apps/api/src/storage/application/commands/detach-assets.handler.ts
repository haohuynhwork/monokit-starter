import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { checkAssetSlot } from "../../domain/asset-slots.js";
import {
  ASSET_USAGE_REPOSITORY,
  type AssetUsageRepository,
} from "../../domain/asset-usage.repository.js";
import { DetachAssetsCommand } from "./detach-assets.command.js";

@CommandHandler(DetachAssetsCommand)
export class DetachAssetsHandler
  implements ICommandHandler<DetachAssetsCommand>
{
  constructor(
    @Inject(ASSET_USAGE_REPOSITORY)
    private readonly usages: AssetUsageRepository,
  ) {}

  execute(command: DetachAssetsCommand): Promise<bigint[]> {
    if (command.slot !== undefined) {
      checkAssetSlot(command.ownerType, command.slot);
    }
    return this.usages.detach({
      ownerType: command.ownerType,
      ownerId: command.ownerId,
      slot: command.slot,
    });
  }
}
