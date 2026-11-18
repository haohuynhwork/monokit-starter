import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ListRatingsQuery, type RatingPage } from "./list-ratings.query.js";

@QueryHandler(ListRatingsQuery)
export class ListRatingsHandler implements IQueryHandler<ListRatingsQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({
    productId,
    limit,
    offset,
  }: ListRatingsQuery): Promise<RatingPage> {
    const ratings = this.db.orm.public.ProductRating.where({
      productId,
    });
    const [rows, { total }] = await Promise.all([
      ratings
        .select("id", "userId", "stars", "body", "createdAt", "updatedAt")
        .orderBy([
          (r) => r.updatedAt.desc(),
          (r) => r.id.desc(),
        ])
        .limit(limit)
        .offset(offset)
        .all(),
      ratings.aggregate((a) => ({
        total: a.count(),
      })),
    ]);
    return {
      items: rows.map((r) => ({
        ...r,
        id: String(r.id),
        userId: String(r.userId),
      })),
      total,
    };
  }
}
