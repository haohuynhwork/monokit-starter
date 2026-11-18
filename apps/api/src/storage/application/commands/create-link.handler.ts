import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { AssetNotFoundError } from "../../domain/asset.errors.js";
import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from "../../domain/asset.repository.js";
import {
  checkLinkUrl,
  checkName,
  checkParent,
  slugCandidates,
  toSlug,
} from "../../domain/asset-rules.js";
import { CheckFolderAccessQuery } from "../queries/check-folder-access.query.js";
import { CreateLinkCommand } from "./create-link.command.js";

@CommandHandler(CreateLinkCommand)
export class CreateLinkHandler implements ICommandHandler<CreateLinkCommand> {
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    private readonly queries: QueryBus,
  ) {}

  async execute(command: CreateLinkCommand): Promise<bigint> {
    await this.queries.execute(
      new CheckFolderAccessQuery(command.parentId, command.actor),
    );
    const name = checkName(command.name);
    const url = checkLinkUrl(command.url);
    if (command.parentId !== null) {
      const parent = await this.assets.findById(command.parentId);
      if (!parent) {
        throw new AssetNotFoundError();
      }
      checkParent(parent);
    }
    // Like uploads: 'photo.jpg', or 'photo-2.jpg' when taken
    const slug = await this.assets.freeSlug(
      command.parentId,
      slugCandidates(toSlug(name)),
    );
    // Links point at something already public elsewhere
    return this.assets.create({
      parentId: command.parentId,
      kind: "link",
      visibility: "public",
      slug,
      filename: name,
      createdById: command.actor?.id ?? null,
      url,
    });
  }
}
