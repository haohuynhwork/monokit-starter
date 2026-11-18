import { randomUUID } from "node:crypto";
import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { Email } from "../../domain/email.js";
import {
  PASSWORD_HASHER,
  Password,
  type PasswordHasher,
} from "../../domain/password.js";
import {
  USER_REPOSITORY,
  type UserRepository,
} from "../../domain/user.repository.js";
import {
  type VerifiedUser,
  VerifyCredentialsQuery,
} from "./verify-credentials.query.js";

@QueryHandler(VerifyCredentialsQuery)
export class VerifyCredentialsHandler
  implements IQueryHandler<VerifyCredentialsQuery>
{
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  // Hash of a random password, verified against when the email is unknown
  // so response times don't reveal which emails exist
  private dummyHash?: Promise<string>;

  async execute(query: VerifyCredentialsQuery): Promise<VerifiedUser | null> {
    let email: Email;
    try {
      email = Email.parse(query.email);
    } catch {
      return null;
    }
    const user = await this.users.findByEmail(email);
    const hash = user?.passwordHash;
    const ok = await this.hasher.verify(
      hash ?? (await this.dummy()),
      query.password,
    );
    if (!user || !hash || !ok || !user.canSignIn) {
      return null;
    }
    return {
      id: user.id!,
      role: user.role,
    };
  }

  private dummy(): Promise<string> {
    this.dummyHash ??= this.hasher.hash(Password.parse(randomUUID()));
    return this.dummyHash;
  }
}
