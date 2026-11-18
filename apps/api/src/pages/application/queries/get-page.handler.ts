import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { GetPageQuery } from "./get-page.query.js";
import { type PageView, SUMMARY_FIELDS, toSummary } from "./page.view.js";

@QueryHandler(GetPageQuery)
export class GetPageHandler implements IQueryHandler<GetPageQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ pageId }: GetPageQuery): Promise<PageView | null> {
    const row = await this.db.orm.public.Page.select(
      ...SUMMARY_FIELDS,
      "description",
      "settings",
      "createdAt",
    )
      .where({
        id: pageId,
      })
      .where((p) => p.deletedAt.isNull())
      .first();
    if (!row) {
      return null;
    }
    return {
      ...toSummary(row),
      description: row.description,
      settings: row.settings as Record<string, unknown>,
      createdAt: row.createdAt,
    };
  }
}
