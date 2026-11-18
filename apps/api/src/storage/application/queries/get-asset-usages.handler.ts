import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import {
  ASSET_USAGE_REPOSITORY,
  type AssetUsageRepository,
} from "../../domain/asset-usage.repository.js";
import { STORAGE, type Storage } from "../../domain/storage.js";
import { URL_SIGNER, type UrlSigner } from "../../domain/url-signer.js";
import { assetUrl } from "./asset.view.js";
import {
  GetAssetUsagesQuery,
  type UsedAsset,
} from "./get-asset-usages.query.js";

@QueryHandler(GetAssetUsagesQuery)
export class GetAssetUsagesHandler
  implements IQueryHandler<GetAssetUsagesQuery>
{
  constructor(
    @Inject(ASSET_USAGE_REPOSITORY)
    private readonly usages: AssetUsageRepository,
    @InjectDb() private readonly db: Db,
    @Inject(STORAGE) private readonly storage: Storage,
    @Inject(URL_SIGNER) private readonly signer: UrlSigner,
  ) {}

  async execute(query: GetAssetUsagesQuery): Promise<Map<string, UsedAsset[]>> {
    const rows = await this.usages.list(
      query.ownerType,
      query.ownerIds,
      query.slot,
    );
    const assetIds = [
      ...new Set(rows.map((r) => r.assetId)),
    ];
    const assets =
      assetIds.length === 0
        ? []
        : await this.db.orm.public.Asset.select(
            "id",
            "kind",
            "visibility",
            "storage",
            "storageKey",
            "url",
          )
            .where((a) => a.id.in(assetIds))
            .all();
    const byId = new Map(
      assets.map((a) => [
        a.id,
        a,
      ]),
    );

    const result = new Map<string, UsedAsset[]>();
    for (const row of rows) {
      const asset = byId.get(row.assetId);
      const url = asset
        ? await assetUrl(asset, this.storage, this.signer, query.viewerId)
        : null;
      const key = String(row.ownerId);
      result.set(key, [
        ...(result.get(key) ?? []),
        {
          assetId: String(row.assetId),
          url,
        },
      ]);
    }
    return result;
  }
}
