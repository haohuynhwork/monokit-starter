import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ListActiveUserIdsQuery } from "./list-active-user-ids.query.js";
import { roleIdsByKey } from "./role-lookup.js";

@QueryHandler(ListActiveUserIdsQuery)
export class ListActiveUserIdsHandler
  implements IQueryHandler<ListActiveUserIdsQuery>
{
  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ roles }: ListActiveUserIdsQuery): Promise<bigint[]> {
    const roleIds = roles ? await roleIdsByKey(this.db, roles) : null;
    const rows = await this.db.orm.public.User.select("id")
      .where({
        status: "active",
      })
      .where((u) => u.deletedAt.isNull())
      .where((u) => (roleIds ? u.roleId.in(roleIds) : u.id.isNotNull()))
      .limit(10000)
      .all();
    return rows.map((r) => r.id);
  }
}
