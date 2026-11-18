import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import { PERMISSIONS } from "../../domain/permissions.js";
import {
  ListPermissionsQuery,
  type PermissionsView,
} from "./list-permissions.query.js";
import { ListRolesQuery } from "./list-roles.query.js";

@QueryHandler(ListPermissionsQuery)
export class ListPermissionsHandler
  implements IQueryHandler<ListPermissionsQuery>
{
  constructor(private readonly queries: QueryBus) {}

  // The matrix comes from the roles in the database, so custom roles show
  async execute(): Promise<PermissionsView> {
    const roles = await this.queries.execute(new ListRolesQuery());
    return {
      roles: roles.map((r) => r.key),
      permissions: PERMISSIONS.map(({ key, group, label }) => ({
        key,
        group,
        label,
        roles: roles
          .filter((r) => r.permissions.includes(key))
          .map((r) => r.key),
      })),
    };
  }
}
