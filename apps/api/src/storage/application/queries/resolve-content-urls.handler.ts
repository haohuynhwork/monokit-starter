import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import {
  ASSET_REF_ATTR,
  inlineAssetKeys,
  isAssetRef,
} from "../../../common/domain/html.js";
import { webPath } from "../../../common/infrastructure/web-path.js";
import { STORAGE, type Storage } from "../../domain/storage.js";
import { ResolveContentUrlsQuery } from "./resolve-content-urls.query.js";

@QueryHandler(ResolveContentUrlsQuery)
export class ResolveContentUrlsHandler
  implements IQueryHandler<ResolveContentUrlsQuery>
{
  constructor(
    @InjectDb() private readonly db: Db,
    @Inject(STORAGE) private readonly storage: Storage,
  ) {}

  async execute({ htmls }: ResolveContentUrlsQuery): Promise<string[]> {
    const keys = [
      ...new Set(htmls.flatMap(inlineAssetKeys)),
    ];
    if (keys.length === 0) {
      return htmls;
    }
    // 'serve/<key>' -> URL: public files of this backend, public links
    const rows = await this.db.orm.public.Asset.select(
      "kind",
      "storage",
      "storageKey",
      "key",
      "url",
    )
      .where({
        visibility: "public",
      })
      .where((a) => a.key.in(keys as never[]))
      .all();
    const urls = new Map<string, string>();
    for (const r of rows) {
      const url =
        r.kind === "link"
          ? r.url
          : r.kind === "file" && r.storage === this.storage.name && r.storageKey
            ? await this.storage.url(r.storageKey)
            : null;
      if (url) {
        urls.set(`serve/${r.key}`, url);
      }
    }
    return htmls.map((html) =>
      html.replace(ASSET_REF_ATTR, (whole, attr: string, ref: string) =>
        isAssetRef(ref)
          ? `${attr}="${urls.get(ref) ?? webPath(`/${ref}`)}"`
          : whole,
      ),
    );
  }
}
