import { Query } from "@nestjs/cqrs";

// What a role key may do; empty for an unknown or deleted role. Cached, so
// the auth guard can ask on every request.
export class GetRolePermissionsQuery extends Query<ReadonlySet<string>> {
  constructor(readonly roleKey: string) {
    super();
  }
}
