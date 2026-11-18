import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { GetPublicLinkUrlQuery } from "./get-public-link-url.query.js";

@QueryHandler(GetPublicLinkUrlQuery)
export class GetPublicLinkUrlHandler
  implements IQueryHandler<GetPublicLinkUrlQuery>
{
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ key }: GetPublicLinkUrlQuery): Promise<string | null> {
    const row = await this.db.orm.public.Asset.select("url")
      .where({
        kind: "link",
        visibility: "public",
        key: key as never,
      })
      .first();
    return row?.url ?? null;
  }
}
