import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import {
  GetSessionUserQuery,
  type SessionUser,
} from "./get-session-user.query.js";
import { roleKeysById } from "./role-lookup.js";

@QueryHandler(GetSessionUserQuery)
export class GetSessionUserHandler
  implements IQueryHandler<GetSessionUserQuery>
{
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ userId }: GetSessionUserQuery): Promise<SessionUser | null> {
    const row = await this.db.orm.public.User.select("roleId")
      .where({
        id: userId,
        status: "active",
      })
      .where((u) => u.deletedAt.isNull())
      .first();
    if (!row) {
      return null;
    }
    const role = (await roleKeysById(this.db)).get(row.roleId);
    return role
      ? {
          role,
        }
      : null;
  }
}
