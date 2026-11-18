import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { STORAGE, type Storage } from "../../domain/storage.js";
import { URL_SIGNER, type UrlSigner } from "../../domain/url-signer.js";
import { assetUrl } from "./asset.view.js";
import { GetAssetUrlQuery } from "./get-asset-url.query.js";

@QueryHandler(GetAssetUrlQuery)
export class GetAssetUrlHandler implements IQueryHandler<GetAssetUrlQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    @Inject(STORAGE) private readonly storage: Storage,
    @Inject(URL_SIGNER) private readonly signer: UrlSigner,
  ) {}

  async execute({
    assetId,
    viewerId,
  }: GetAssetUrlQuery): Promise<string | null> {
    const row = await this.db.orm.public.Asset.select(
      "id",
      "kind",
      "visibility",
      "storage",
      "storageKey",
      "url",
    )
      .where({
        id: assetId,
      })
      .first();
    return row ? assetUrl(row, this.storage, this.signer, viewerId) : null;
  }
}
