import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { checkAssetSlot } from "../../domain/asset-slots.js";
import {
  ASSET_USAGE_REPOSITORY,
  type AssetUsageRepository,
} from "../../domain/asset-usage.repository.js";
import { AttachAssetCommand } from "./attach-asset.command.js";

@CommandHandler(AttachAssetCommand)
export class AttachAssetHandler implements ICommandHandler<AttachAssetCommand> {
  constructor(
    @Inject(ASSET_USAGE_REPOSITORY)
    private readonly usages: AssetUsageRepository,
  ) {}

  execute(command: AttachAssetCommand): Promise<bigint[]> {
    const { single } = checkAssetSlot(command.ownerType, command.slot);
    return this.usages.attach(
      {
        ownerType: command.ownerType,
        ownerId: command.ownerId,
        slot: command.slot,
      },
      command.assetId,
      {
        single,
        position: command.position,
      },
    );
  }
}
