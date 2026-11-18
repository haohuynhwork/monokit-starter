import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { GetUserQuery } from "./get-user.query.js";
import { roleKeysById } from "./role-lookup.js";
import { toUserViews, USER_VIEW_FIELDS, type UserView } from "./user.view.js";

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  async execute({ userId }: GetUserQuery): Promise<UserView | null> {
    const row = await this.db.orm.public.User.select(...USER_VIEW_FIELDS)
      .where((u) => u.id.eq(userId))
      .where((u) => u.deletedAt.isNull())
      .first();
    if (!row) {
      return null;
    }
    const [view] = await toUserViews(
      [
        row,
      ],
      this.queries,
      await roleKeysById(this.db),
    );
    return view ?? null;
  }
}
