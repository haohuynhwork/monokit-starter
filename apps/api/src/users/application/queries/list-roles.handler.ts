import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { ListRolesQuery, type RoleView } from "./list-roles.query.js";

@QueryHandler(ListRolesQuery)
export class ListRolesHandler implements IQueryHandler<ListRolesQuery> {
  constructor(@InjectDb() private readonly db: Db) {}

  async execute(): Promise<RoleView[]> {
    const { orm } = this.db;
    const [roles, permissions, grants, users] = await Promise.all([
      orm.public.Role.where((r) => r.deletedAt.isNull()).all(),
      orm.public.Permission.select("id", "key").all(),
      orm.public.RolePermission.select("roleId", "permissionId").all(),
      orm.public.User.select("roleId")
        .where((u) => u.deletedAt.isNull())
        .all(),
    ]);
    const keys = new Map(
      permissions.map((p) => [
        p.id,
        p.key,
      ]),
    );
    const views = roles.map(
      (r): RoleView => ({
        id: String(r.id),
        key: r.key,
        name: r.name,
        description: r.description,
        system: r.system,
        permissions: grants
          .filter((g) => g.roleId === r.id)
          .flatMap((g) => keys.get(g.permissionId) ?? [])
          .sort(),
        users: users.filter((u) => u.roleId === r.id).length,
      }),
    );
    return views.sort(
      (a, b) =>
        Number(b.system) - Number(a.system) ||
        (a.system ? a.id.localeCompare(b.id) : a.name.localeCompare(b.name)),
    );
  }
}
