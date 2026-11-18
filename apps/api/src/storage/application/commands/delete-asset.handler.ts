import { Inject, Logger } from "@nestjs/common";
import { CommandHandler, type ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { AssetNotFoundError } from "../../domain/asset.errors.js";
import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from "../../domain/asset.repository.js";
import { checkCanManage } from "../../domain/asset-rules.js";
import { STORAGE, type Storage } from "../../domain/storage.js";
import { CheckFolderAccessQuery } from "../queries/check-folder-access.query.js";
import { DeleteAssetCommand } from "./delete-asset.command.js";

@CommandHandler(DeleteAssetCommand)
export class DeleteAssetHandler implements ICommandHandler<DeleteAssetCommand> {
  private readonly logger = new Logger(DeleteAssetHandler.name);

  constructor(
    @Inject(STORAGE) private readonly storage: Storage,
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    private readonly queries: QueryBus,
  ) {}

  async execute({ assetId, actor }: DeleteAssetCommand): Promise<void> {
    await this.queries.execute(new CheckFolderAccessQuery(assetId, actor));
    const asset = await this.assets.findById(assetId);
    if (!asset) {
      throw new AssetNotFoundError();
    }
    checkCanManage(actor, asset);

    const stored = await this.assets.deleteSubtree(assetId);
    // After the commit: a leftover file is harmless, a dangling row is not
    for (const { storage, storageKey } of stored) {
      if (storage !== this.storage.name) {
        continue;
      }
      try {
        await this.storage.delete(storageKey);
      } catch (error) {
        this.logger.warn(`Could not delete ${storageKey}: ${String(error)}`);
      }
    }
  }
}
