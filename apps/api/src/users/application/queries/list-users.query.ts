import { Query } from "@nestjs/cqrs";
import type { UserRole, UserStatus } from "../../domain/user.js";
import type { UserView } from "./user.view.js";

export interface UserPage {
  items: UserView[];
  total: number;
}

// Newest first, non-deleted only
export class ListUsersQuery extends Query<UserPage> {
  constructor(
    // q: part of the email or name, case-insensitive
    readonly filter: {
      role?: UserRole;
      status?: UserStatus;
      q?: string;
    },
    readonly limit: number,
    readonly offset: number,
  ) {
    super();
  }
}
