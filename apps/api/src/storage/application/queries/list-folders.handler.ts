import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { type FolderOption, ListFoldersQuery } from "./list-folders.query.js";

@QueryHandler(ListFoldersQuery)
export class ListFoldersHandler implements IQueryHandler<ListFoldersQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute(): Promise<FolderOption[]> {
    const rows = await this.db.orm.public.Asset.select(
      "id",
      "filename",
      "fullSlug",
    )
      .where({
        kind: "directory",
      })
      .orderBy((a) => a.fullSlug.asc())
      .limit(1000)
      .all();
    return rows.map((r) => ({
      id: String(r.id),
      name: r.filename,
      path: r.fullSlug,
    }));
  }
}
