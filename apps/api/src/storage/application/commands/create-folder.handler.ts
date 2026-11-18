import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { AssetNotFoundError } from "../../domain/asset.errors.js";
import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from "../../domain/asset.repository.js";
import { checkName, checkParent, toSlug } from "../../domain/asset-rules.js";
import { CheckFolderAccessQuery } from "../queries/check-folder-access.query.js";
import { CreateFolderCommand } from "./create-folder.command.js";

@CommandHandler(CreateFolderCommand)
export class CreateFolderHandler
  implements ICommandHandler<CreateFolderCommand>
{
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    private readonly queries: QueryBus,
  ) {}

  async execute(command: CreateFolderCommand): Promise<bigint> {
    await this.queries.execute(
      new CheckFolderAccessQuery(command.parentId, command.actor),
    );
    const name = checkName(command.name);
    if (command.parentId !== null) {
      const parent = await this.assets.findById(command.parentId);
      if (!parent) {
        throw new AssetNotFoundError();
      }
      checkParent(parent);
    }
    // A folder's name is chosen, not uploaded: a clash is an error, not -2
    return this.assets.create({
      parentId: command.parentId,
      kind: "directory",
      visibility: command.visibility,
      slug: toSlug(name),
      filename: name,
      createdById: command.actor?.id ?? null,
    });
  }
}
