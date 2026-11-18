import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { IsPagePathTakenQuery } from "./is-page-path-taken.query.js";

@QueryHandler(IsPagePathTakenQuery)
export class IsPagePathTakenHandler
  implements IQueryHandler<IsPagePathTakenQuery>
{
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ path, localeId }: IsPagePathTakenQuery): Promise<boolean> {
    if (localeId !== undefined) {
      // Translation paths are NULL while the page is deleted
      const translated = await this.db.orm.public.PageTranslation.select("id")
        .where({
          localeId,
        })
        .where((t) => t.fullSlug.eq(path as never))
        .first();
      return translated !== null;
    }
    const row = await this.db.orm.public.Page.select("id")
      .where((p) => p.fullSlug.eq(path as never))
      .where((p) => p.deletedAt.isNull())
      .first();
    return row !== null;
  }
}
