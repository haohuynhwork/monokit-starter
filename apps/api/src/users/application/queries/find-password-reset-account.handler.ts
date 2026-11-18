import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { Email } from "../../domain/email.js";
import { passwordFingerprint } from "../../domain/password.js";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/user.repository.js";
import {
  FindPasswordResetAccountQuery,
  type PasswordResetAccount,
} from "./find-password-reset-account.query.js";

@QueryHandler(FindPasswordResetAccountQuery)
export class FindPasswordResetAccountHandler
  implements IQueryHandler<FindPasswordResetAccountQuery>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute({
    by,
  }: FindPasswordResetAccountQuery): Promise<PasswordResetAccount | null> {
    let user;
    if ("userId" in by) {
      user = await this.users.findById(by.userId);
    } else {
      try {
        user = await this.users.findByEmail(Email.parse(by.email));
      } catch {
        return null;
      }
    }
    if (!user?.canResetPassword) {
      return null;
    }
    return {
      userId: user.id!,
      email: user.email.value,
      name: user.greetingName,
      fingerprint: passwordFingerprint(user.passwordHash!),
    };
  }
}
