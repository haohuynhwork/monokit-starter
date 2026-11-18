import { Query } from "@nestjs/cqrs";
import type { UserView } from "./user.view.js";

// Non-deleted users only; null when there is none
export class GetUserQuery extends Query<UserView | null> {
  constructor(readonly userId: bigint) {
    super();
  }
}
