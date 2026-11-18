import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ListPagesQuery } from "./list-pages.query.js";
import { type PageSummary, SUMMARY_FIELDS, toSummary } from "./page.view.js";

@QueryHandler(ListPagesQuery)
export class ListPagesHandler implements IQueryHandler<ListPagesQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute(): Promise<PageSummary[]> {
    const rows = await this.db.orm.public.Page.select(...SUMMARY_FIELDS)
      .where((p) => p.deletedAt.isNull())
      .orderBy([
        (p) => p.menuOrder.asc(),
        (p) => p.title.asc(),
        (p) => p.id.asc(),
      ])
      .all();
    return rows.map(toSummary);
  }
}
