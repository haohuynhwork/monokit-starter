import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { NameTakenError, NotAFolderError } from "../../domain/asset.errors.js";
import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from "../../domain/asset.repository.js";
import { EnsureFolderCommand } from "./ensure-folder.command.js";

@CommandHandler(EnsureFolderCommand)
export class EnsureFolderHandler
  implements ICommandHandler<EnsureFolderCommand>
{
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
  ) {}

  async execute({
    slug,
    name,
    visibility,
  }: EnsureFolderCommand): Promise<bigint> {
    const existing = await this.assets.findRootFolder(slug);
    if (existing) {
      return existing.id;
    }
    try {
      return await this.assets.create({
        parentId: null,
        kind: "directory",
        visibility,
        slug,
        filename: name,
        createdById: null,
      });
    } catch (error) {
      // Created by a concurrent request, or a file holds the name
      if (!(error instanceof NameTakenError)) {
        throw error;
      }
      const folder = await this.assets.findRootFolder(slug);
      if (!folder) {
        throw new NotAFolderError();
      }
      return folder.id;
    }
  }
}
