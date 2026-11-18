import { Query } from "@nestjs/cqrs";
import type { UserRole } from "../../domain/user.js";

export interface SessionUser {
  role: UserRole;
}

// What auth needs to issue tokens. Null unless the user is active and not
// deleted.
export class GetSessionUserQuery extends Query<SessionUser | null> {
  constructor(readonly userId: bigint) {
    super();
  }
}
