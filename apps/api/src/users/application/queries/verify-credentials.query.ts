import { Query } from "@nestjs/cqrs";
import type { UserRole } from "../../domain/user.js";

export interface VerifiedUser {
  id: bigint;
  role: UserRole;
}

// Checks an email + password sign-in. Null when the user is unknown,
// disabled, deleted, has no password, or the password is wrong.
export class VerifyCredentialsQuery extends Query<VerifiedUser | null> {
  constructor(
    readonly email: string,
    readonly password: string,
  ) {
    super();
  }
}
