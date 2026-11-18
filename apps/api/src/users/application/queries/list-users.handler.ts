import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { or } from "@prisma/orm-postgres/orm-client";
import { ListUsersQuery, type UserPage } from "./list-users.query.js";
import { roleIdsByKey, roleKeysById } from "./role-lookup.js";
import { toUserViews, USER_VIEW_FIELDS } from "./user.view.js";

@QueryHandler(ListUsersQuery)
export class ListUsersHandler implements IQueryHandler<ListUsersQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly queries: QueryBus,
  ) {}

  async execute({ filter, limit, offset }: ListUsersQuery): Promise<UserPage> {
    const roleIds = filter.role
      ? await roleIdsByKey(this.db, [
          filter.role,
        ])
      : null;
    if (roleIds && roleIds.length === 0) {
      return {
        items: [],
        total: 0,
      };
    }
    const users = this.db.orm.public.User.where((u) => u.deletedAt.isNull())
      .where((u) => (roleIds ? u.roleId.in(roleIds) : u.id.isNotNull()))
      .where((u) =>
        filter.status ? u.status.eq(filter.status) : u.id.isNotNull(),
      )
      .where((u) => {
        const q = filter.q?.trim();
        if (!q) {
          return u.id.isNotNull();
        }
        const pattern = `%${escapeLike(q)}%`;
        return or(u.email.ilike(pattern), u.displayName.ilike(pattern));
      });

    const [rows, { total }] = await Promise.all([
      users
        .select(...USER_VIEW_FIELDS)
        .orderBy([
          (u) => u.createdAt.desc(),
          (u) => u.id.desc(),
        ])
        .limit(limit)
        .offset(offset)
        .all(),
      users.aggregate((a) => ({
        total: a.count(),
      })),
    ]);
    const items = await toUserViews(
      rows,
      this.queries,
      await roleKeysById(this.db),
    );
    return {
      items,
      total,
    };
  }
}

// ILIKE treats % and _ as wildcards; match them literally
const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");
