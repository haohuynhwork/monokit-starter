import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  InvalidAssetSlotError,
  NameTakenError,
} from "../../domain/asset.errors.js";
import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from "../../domain/asset.repository.js";
import { slugCandidates, toSlug } from "../../domain/asset-rules.js";
import { checkAssetSlot } from "../../domain/asset-slots.js";
import {
  ASSET_USAGE_REPOSITORY,
  type AssetUsageRepository,
} from "../../domain/asset-usage.repository.js";
import { EnsureEntityFolderCommand } from "./ensure-entity-folder.command.js";

@CommandHandler(EnsureEntityFolderCommand)
export class EnsureEntityFolderHandler
  implements ICommandHandler<EnsureEntityFolderCommand>
{
  constructor(
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    @Inject(ASSET_USAGE_REPOSITORY)
    private readonly usages: AssetUsageRepository,
  ) {}

  async execute({
    ownerType,
    ownerId,
    label,
  }: EnsureEntityFolderCommand): Promise<bigint> {
    if (!checkAssetSlot(ownerType, "folder").single) {
      throw new InvalidAssetSlotError(ownerType, "folder");
    }
    const target = {
      ownerType,
      ownerId,
      slot: "folder",
    };
    const [linked] = await this.usages.list(
      ownerType,
      [
        ownerId,
      ],
      "folder",
    );
    if (linked && (await this.assets.findById(linked.assetId))) {
      return linked.assetId;
    }

    // One top-level folder per type ('post' -> Posts). Public: files in
    // posts and products end up on public pages.
    const typeFolderId = await this.typeFolder(ownerType);
    const name = `${label.trim().slice(0, 200) || ownerType} #${ownerId}`;
    const slug = await this.assets.freeSlug(
      typeFolderId,
      slugCandidates(
        toSlug(`${label.trim().slice(0, 200) || ownerType} ${ownerId}`),
      ),
    );
    const folderId = await this.assets.create({
      parentId: typeFolderId,
      kind: "directory",
      visibility: "public",
      slug,
      filename: name,
      createdById: null,
    });
    // A concurrent request may have linked one first; the single slot keeps
    // exactly one, so re-read it
    try {
      await this.usages.attach(target, folderId, {
        single: true,
        position: 0,
      });
      return folderId;
    } catch {
      const [winner] = await this.usages.list(
        ownerType,
        [
          ownerId,
        ],
        "folder",
      );
      return winner?.assetId ?? folderId;
    }
  }

  private async typeFolder(ownerType: string): Promise<bigint> {
    const slug = `${ownerType}s`;
    const existing = await this.assets.findRootFolder(slug);
    if (existing) {
      return existing.id;
    }
    const name = slug.charAt(0).toUpperCase() + slug.slice(1);
    try {
      return await this.assets.create({
        parentId: null,
        kind: "directory",
        visibility: "public",
        slug,
        filename: name,
        createdById: null,
      });
    } catch (error) {
      // Created concurrently
      const folder =
        error instanceof NameTakenError &&
        (await this.assets.findRootFolder(slug));
      if (!folder) {
        throw error;
      }
      return folder.id;
    }
  }
}
