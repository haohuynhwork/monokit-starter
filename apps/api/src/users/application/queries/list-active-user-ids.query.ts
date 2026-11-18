import { Query } from "@nestjs/cqrs";

import type { UserRole } from "../../domain/user.js";

// Everyone who can sign in (active, not deleted), e.g. to notify staff;
// only these roles when given
export class ListActiveUserIdsQuery extends Query<bigint[]> {
  constructor(readonly roles?: UserRole[]) {
    super();
  }
}
