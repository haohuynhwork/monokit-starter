import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { AssetNotFoundError } from "../../domain/asset.errors.js";
import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from "../../domain/asset.repository.js";
import { checkCanManage, checkMove } from "../../domain/asset-rules.js";
import { CheckFolderAccessQuery } from "../queries/check-folder-access.query.js";
import { MoveAssetCommand } from "./move-asset.command.js";

@CommandHandler(MoveAssetCommand)
export class MoveAssetHandler implements ICommandHandler<MoveAssetCommand> {
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    private readonly queries: QueryBus,
  ) {}

  async execute({ assetId, parentId, actor }: MoveAssetCommand): Promise<void> {
    await this.queries.execute(new CheckFolderAccessQuery(assetId, actor));
    await this.queries.execute(new CheckFolderAccessQuery(parentId, actor));
    const asset = await this.assets.findById(assetId);
    if (!asset) {
      throw new AssetNotFoundError();
    }
    checkCanManage(actor, asset);
    if (asset.parentId === parentId) {
      return;
    }
    const target =
      parentId === null ? null : await this.assets.findById(parentId);
    if (parentId !== null && !target) {
      throw new AssetNotFoundError();
    }
    const inside =
      parentId !== null && (await this.assets.isInSubtree(assetId, parentId));
    checkMove(asset, target, inside);
    await this.assets.move(assetId, parentId);
  }
}
