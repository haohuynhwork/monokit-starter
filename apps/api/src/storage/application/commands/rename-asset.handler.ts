import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { AssetNotFoundError } from "../../domain/asset.errors.js";
import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from "../../domain/asset.repository.js";
import { checkCanManage, checkName, toSlug } from "../../domain/asset-rules.js";
import { CheckFolderAccessQuery } from "../queries/check-folder-access.query.js";
import { RenameAssetCommand } from "./rename-asset.command.js";

@CommandHandler(RenameAssetCommand)
export class RenameAssetHandler implements ICommandHandler<RenameAssetCommand> {
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    private readonly queries: QueryBus,
  ) {}

  async execute({ assetId, name, actor }: RenameAssetCommand): Promise<void> {
    await this.queries.execute(new CheckFolderAccessQuery(assetId, actor));
    const asset = await this.assets.findById(assetId);
    if (!asset) {
      throw new AssetNotFoundError();
    }
    checkCanManage(actor, asset);
    const filename = checkName(name);
    await this.assets.rename(assetId, toSlug(filename), filename);
  }
}
