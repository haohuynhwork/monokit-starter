import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { GetUserQuery } from "../../../users/application/queries/get-user.query.js";
import { STORAGE, type Storage } from "../../domain/storage.js";
import { URL_SIGNER, type UrlSigner } from "../../domain/url-signer.js";
import type { FileContent } from "./get-public-file.query.js";
import { GetSignedFileQuery } from "./get-signed-file.query.js";

@QueryHandler(GetSignedFileQuery)
export class GetSignedFileHandler implements IQueryHandler<GetSignedFileQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    @Inject(STORAGE) private readonly storage: Storage,
    @Inject(URL_SIGNER) private readonly signer: UrlSigner,
    private readonly queries: QueryBus,
  ) {}

  async execute({
    assetId,
    params,
  }: GetSignedFileQuery): Promise<FileContent | null> {
    // 1-2: not expired, signature matches (constant time)
    const userId = this.signer.verify(assetId, params);
    if (userId === null) {
      return null;
    }
    // 3: the link only proves it was issued; access may since be revoked.
    // Private files are for active staff.
    const user = await this.queries.execute(new GetUserQuery(userId));
    if (!user || user.status !== "active") {
      return null;
    }
    const row = await this.db.orm.public.Asset.select(
      "filename",
      "mimeType",
      "sizeBytes",
      "checksum",
      "storageKey",
    )
      .where({
        id: assetId,
        kind: "file",
        storage: this.storage.name,
      })
      .first();
    return row ? toFileContent(row, this.storage) : null;
  }
}

export function toFileContent(
  row: {
    filename: string;
    mimeType: string | null;
    sizeBytes: bigint | null;
    checksum: string | null;
    storageKey: string | null;
  },
  storage: Storage,
): FileContent | null {
  const { storageKey } = row;
  if (!storageKey || !row.mimeType || row.sizeBytes === null || !row.checksum) {
    return null;
  }
  return {
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    checksum: row.checksum,
    open: async () => (await storage.get(storageKey)).body,
  };
}
