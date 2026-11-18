import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import {
  ROLE_PERMISSIONS_READER,
  type RolePermissionsReader,
} from "../../domain/role-permissions.reader.js";
import { GetRolePermissionsQuery } from "./get-role-permissions.query.js";

@QueryHandler(GetRolePermissionsQuery)
export class GetRolePermissionsHandler
  implements IQueryHandler<GetRolePermissionsQuery>
{
  constructor(
    @Inject(ROLE_PERMISSIONS_READER)
    private readonly reader: RolePermissionsReader,
  ) {}

  execute({ roleKey }: GetRolePermissionsQuery): Promise<ReadonlySet<string>> {
    return this.reader.permissionsOf(roleKey);
  }
}
