import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { AssetNotFoundError } from "../../domain/asset.errors.js";
import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from "../../domain/asset.repository.js";
import {
  checkCanManage,
  checkIsLink,
  checkLinkUrl,
} from "../../domain/asset-rules.js";
import { SetLinkUrlCommand } from "./set-link-url.command.js";

@CommandHandler(SetLinkUrlCommand)
export class SetLinkUrlHandler implements ICommandHandler<SetLinkUrlCommand> {
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
  ) {}

  async execute({ assetId, url, actor }: SetLinkUrlCommand): Promise<void> {
    const asset = await this.assets.findById(assetId);
    if (!asset) {
      throw new AssetNotFoundError();
    }
    checkCanManage(actor, asset);
    checkIsLink(asset);
    await this.assets.setLinkUrl(assetId, checkLinkUrl(url));
  }
}
