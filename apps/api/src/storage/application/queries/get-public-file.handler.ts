import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { STORAGE, type Storage } from "../../domain/storage.js";
import {
  type FileContent,
  GetPublicFileQuery,
} from "./get-public-file.query.js";
import { toFileContent } from "./get-signed-file.handler.js";

@QueryHandler(GetPublicFileQuery)
export class GetPublicFileHandler implements IQueryHandler<GetPublicFileQuery> {
  constructor(
    @Inject(STORAGE) private readonly storage: Storage,
    @InjectDb() private readonly db: Db,
  ) {}

  async execute({ by }: GetPublicFileQuery): Promise<FileContent | null> {
    // The key alone is not enough: the asset must exist and be public
    const row = await this.db.orm.public.Asset.select(
      "filename",
      "mimeType",
      "sizeBytes",
      "checksum",
      "storageKey",
    )
      .where({
        kind: "file",
        visibility: "public",
        storage: this.storage.name,
        ...("key" in by
          ? {
              key: by.key as never,
            }
          : {
              storageKey: by.storageKey as never,
            }),
      })
      .first();
    return row ? toFileContent(row, this.storage) : null;
  }
}
