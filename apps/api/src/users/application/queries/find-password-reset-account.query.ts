import { Query } from "@nestjs/cqrs";

export interface PasswordResetAccount {
  userId: bigint;
  email: string;
  // What to greet them with
  name: string;
  // passwordFingerprint of the current hash
  fingerprint: string;
}

// The account a password reset is for, by email (requesting a link) or id
// (using one); null unless it may reset (User.canResetPassword)
export class FindPasswordResetAccountQuery extends Query<PasswordResetAccount | null> {
  constructor(
    readonly by:
      | {
          email: string;
        }
      | {
          userId: bigint;
        },
  ) {
    super();
  }
}
