import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { STORAGE, type Storage } from "../../domain/storage.js";
import { URL_SIGNER, type UrlSigner } from "../../domain/url-signer.js";
import {
  ASSET_VIEW_FIELDS,
  type AssetView,
  toAssetView,
} from "./asset.view.js";
import { CheckFolderAccessQuery } from "./check-folder-access.query.js";
import { GetAssetQuery } from "./get-asset.query.js";

@QueryHandler(GetAssetQuery)
export class GetAssetHandler implements IQueryHandler<GetAssetQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    @Inject(STORAGE) private readonly storage: Storage,
    @Inject(URL_SIGNER) private readonly signer: UrlSigner,
    private readonly queries: QueryBus,
  ) {}

  async execute({
    by,
    viewerId,
    actor,
  }: GetAssetQuery): Promise<AssetView | null> {
    const row = await this.db.orm.public.Asset.select(...ASSET_VIEW_FIELDS)
      .where((a) =>
        "id" in by ? a.id.eq(by.id) : a.fullSlug.eq(by.path as never),
      )
      .first();
    if (row) {
      await this.queries.execute(new CheckFolderAccessQuery(row.id, actor));
    }
    return row ? toAssetView(row, this.storage, this.signer, viewerId) : null;
  }
}
