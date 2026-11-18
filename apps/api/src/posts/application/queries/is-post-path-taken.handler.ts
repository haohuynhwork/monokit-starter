import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { IsPostPathTakenQuery } from "./is-post-path-taken.query.js";

@QueryHandler(IsPostPathTakenQuery)
export class IsPostPathTakenHandler
  implements IQueryHandler<IsPostPathTakenQuery>
{
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ path }: IsPostPathTakenQuery): Promise<boolean> {
    const row = await this.db.orm.public.Post.select("id")
      .where((p) => p.fullSlug.eq(path as never))
      .where((p) => p.deletedAt.isNull())
      .first();
    return row !== null;
  }
}
