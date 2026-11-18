import { createHash, randomUUID } from "node:crypto";
import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { AssetNotFoundError } from "../../domain/asset.errors.js";
import {
  ASSET_REPOSITORY,
  type AssetRepository,
} from "../../domain/asset.repository.js";
import {
  checkName,
  checkParent,
  slugCandidates,
  toSlug,
} from "../../domain/asset-rules.js";
import { checkFile, FILE_EXTENSIONS } from "../../domain/file-policy.js";
import { STORAGE, type Storage } from "../../domain/storage.js";
import { CheckFolderAccessQuery } from "../queries/check-folder-access.query.js";
import { UploadAssetCommand } from "./upload-asset.command.js";

@CommandHandler(UploadAssetCommand)
export class UploadAssetHandler implements ICommandHandler<UploadAssetCommand> {
  constructor(
    @Inject(STORAGE) private readonly storage: Storage,
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepository,
    private readonly queries: QueryBus,
  ) {}

  async execute(command: UploadAssetCommand): Promise<bigint> {
    const mimeType = checkFile(command.content, command.policy);
    const filename = checkName(cleanFilename(command.filename));
    await this.queries.execute(
      new CheckFolderAccessQuery(command.parentId, command.actor),
    );
    const { parentId } = command;
    if (parentId !== null) {
      const parent = await this.assets.findById(parentId);
      if (!parent) {
        throw new AssetNotFoundError();
      }
      checkParent(parent);
    }
    // 'Logo.png' -> 'logo.png', or 'logo-2.png' when taken
    const slug = await this.assets.freeSlug(
      parentId,
      slugCandidates(toSlug(filename)),
    );

    // Opaque and unguessable; never derived from the filename
    const key = `${randomUUID()}.${FILE_EXTENSIONS[mimeType]}`;
    // Bytes first: a row must never point at a missing object
    await this.storage.put(key, command.content, {
      contentLength: command.content.length,
      contentType: mimeType,
    });
    try {
      return await this.assets.create({
        parentId,
        kind: "file",
        visibility: command.visibility,
        slug,
        filename,
        createdById: command.actor?.id ?? null,
        mimeType,
        sizeBytes: BigInt(command.content.length),
        storage: this.storage.name,
        storageKey: key,
        // Starts equal to the storage key; stays when the file moves to
        // another backend, under a new storage key
        key,
        checksum: createHash("sha256").update(command.content).digest("hex"),
      });
    } catch (error) {
      await this.storage.delete(key);
      throw error;
    }
  }
}

// Strip any path the browser sent along
function cleanFilename(name: string): string {
  return (name.split(/[\\/]/).pop() ?? "").trim() || "file";
}
