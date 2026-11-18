import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { AssetNotFoundError } from "../../domain/asset.errors.js";
import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from "../../domain/asset.repository.js";
import { checkCanManage } from "../../domain/asset-rules.js";
import { SetAssetVisibilityCommand } from "./set-asset-visibility.command.js";

@CommandHandler(SetAssetVisibilityCommand)
export class SetAssetVisibilityHandler
  implements ICommandHandler<SetAssetVisibilityCommand>
{
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
  ) {}

  async execute(command: SetAssetVisibilityCommand): Promise<void> {
    const asset = await this.assets.findById(command.assetId);
    if (!asset) {
      throw new AssetNotFoundError();
    }
    checkCanManage(command.actor, asset);
    await this.assets.setVisibility(command.assetId, command.visibility);
  }
}
