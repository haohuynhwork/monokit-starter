import { Injectable } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { GetRolePermissionsQuery } from "../../users/application/queries/get-role-permissions.query.js";

// What a role key may do, for the guards (a cached lookup in users)
@Injectable()
export class PermissionResolver {
  constructor(private readonly queries: QueryBus) {}

  permissionsOf(role: string): Promise<ReadonlySet<string>> {
    return this.queries.execute(new GetRolePermissionsQuery(role));
  }
}
