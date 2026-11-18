import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { or } from "@prisma/orm-postgres/orm-client";
import { STORAGE, type Storage } from "../../domain/storage.js";
import { URL_SIGNER, type UrlSigner } from "../../domain/url-signer.js";
import { ASSET_VIEW_FIELDS, type Crumb, toAssetView } from "./asset.view.js";
import { CheckFolderAccessQuery } from "./check-folder-access.query.js";
import { type AssetListing, ListAssetsQuery } from "./list-assets.query.js";

@QueryHandler(ListAssetsQuery)
export class ListAssetsHandler implements IQueryHandler<ListAssetsQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    @Inject(STORAGE) private readonly storage: Storage,
    @Inject(URL_SIGNER) private readonly signer: UrlSigner,
    private readonly queries: QueryBus,
  ) {}

  async execute({
    folderId,
    viewerId,
    options,
    actor,
  }: ListAssetsQuery): Promise<AssetListing | null> {
    await this.queries.execute(new CheckFolderAccessQuery(folderId, actor));
    const view = (row: Parameters<typeof toAssetView>[0]) =>
      toAssetView(row, this.storage, this.signer, viewerId);

    let folder: AssetListing["folder"] = null;
    let breadcrumbs: Crumb[] = [];
    if (folderId !== null) {
      const row = await this.db.orm.public.Asset.select(...ASSET_VIEW_FIELDS)
        .where({
          id: folderId,
          kind: "directory",
        })
        .first();
      if (!row) {
        return null;
      }
      folder = await view(row);
      breadcrumbs = await this.breadcrumbs(folderId);
    }

    const q = options.q?.trim();
    // A search covers the folder's subtree, found through the closure table
    const scope =
      q && folderId !== null ? await this.descendants(folderId) : null;
    if (scope?.length === 0) {
      return {
        folder,
        breadcrumbs,
        items: [],
        total: 0,
      };
    }

    const matching = this.db.orm.public.Asset.where((a) =>
      scope
        ? a.id.in(scope)
        : q
          ? a.id.isNotNull()
          : folderId === null
            ? a.parentId.isNull()
            : a.parentId.eq(folderId),
    )
      .where((a) =>
        q ? a.filename.ilike(`%${escapeLike(q)}%`) : a.id.isNotNull(),
      )
      .where((a) =>
        options.type === "image"
          ? or(
              a.kind.eq("directory"),
              a.kind.eq("link"),
              a.mimeType.like("image/%"),
            )
          : a.id.isNotNull(),
      );

    const dir = options.order;
    const [rows, { total }] = await Promise.all([
      matching
        .select(...ASSET_VIEW_FIELDS)
        // Folders first: 'directory' sorts before 'file' and 'link'
        .orderBy([
          (a) => a.kind.asc(),
          options.sort === "size"
            ? (a) =>
                a.sizeBytes[dir]({
                  nulls: "last",
                })
            : options.sort === "createdAt"
              ? (a) => a.createdAt[dir]()
              : (a) => a.filename[dir](),
          (a) => a.id[dir](),
        ])
        .limit(options.limit)
        .offset(options.offset)
        .all(),
      matching.aggregate((a) => ({
        total: a.count(),
      })),
    ]);
    return {
      folder,
      breadcrumbs,
      items: await Promise.all(rows.map(view)),
      total,
    };
  }

  // Everything below a folder (not the folder itself)
  private async descendants(id: bigint): Promise<bigint[]> {
    const rows = await this.db.orm.public.AssetClosure.select("descendantId")
      .where({
        ancestorId: id,
      })
      .where((c) => c.depth.gt(0))
      .limit(10000)
      .all();
    return rows.map((r) => r.descendantId);
  }

  // Ancestors through the closure table, root first
  private async breadcrumbs(id: bigint): Promise<Crumb[]> {
    const rows = await this.db.orm.public.AssetClosure.select("depth")
      .where({
        descendantId: id,
      })
      .include("ancestor", (a) => a.select("id", "filename"))
      .orderBy((c) => c.depth.desc())
      .all();
    return rows.flatMap((r) =>
      r.ancestor
        ? [
            {
              id: String(r.ancestor.id),
              name: r.ancestor.filename,
            },
          ]
        : [],
    );
  }
}

// ILIKE treats % and _ as wildcards; match them literally
const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");
