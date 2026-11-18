import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { STORAGE, type Storage } from "../../domain/storage.js";
import { FindPublicFilesByKeysQuery } from "./find-public-files.query.js";

type Row = {
  id: bigint;
  kind: string;
  storage: string | null;
  storageKey: string | null;
  key: string;
};

@QueryHandler(FindPublicFilesByKeysQuery)
export class FindPublicFilesByKeysHandler
  implements IQueryHandler<FindPublicFilesByKeysQuery>
{
  constructor(
    @InjectDb() private readonly db: Db,
    @Inject(STORAGE) private readonly storage: Storage,
  ) {}

  async execute({
    storageKeys,
    assetKeys,
  }: FindPublicFilesByKeysQuery): Promise<bigint[]> {
    // Older /files/<storage key> URLs are this backend's files only;
    // 'serve/<key>' references may also be links
    const [files, refs] = await Promise.all([
      this.find("storageKey", storageKeys),
      this.find("key", assetKeys),
    ]);
    return [
      ...pick(
        storageKeys,
        files.filter((r) => r.kind === "file"),
        (r) => r.storageKey,
      ),
      ...pick(assetKeys, refs, (r) => r.key),
    ];
  }

  // Public files of this backend and public links
  private async find(
    column: "storageKey" | "key",
    values: string[],
  ): Promise<Row[]> {
    if (values.length === 0) {
      return [];
    }
    const rows = await this.db.orm.public.Asset.select(
      "id",
      "kind",
      "storage",
      "storageKey",
      "key",
    )
      .where({
        visibility: "public",
      })
      .where((a) => a[column].in(values as never[]))
      .all();
    return (rows as Row[]).filter(
      (r) =>
        r.kind === "link" ||
        (r.kind === "file" && r.storage === this.storage.name),
    );
  }
}

// Ids in the order of `wanted`; missing ones left out
function pick(
  wanted: string[],
  rows: Row[],
  by: (r: Row) => string | null,
): bigint[] {
  const ids = new Map(
    rows.map((r) => [
      by(r),
      r.id,
    ]),
  );
  return wanted.flatMap((w) => {
    const id = ids.get(w);
    return id === undefined
      ? []
      : [
          id,
        ];
  });
}
