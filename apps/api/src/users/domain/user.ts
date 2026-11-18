import { Email } from "./email.js";
import { ADMIN_ROLE_KEY, DEFAULT_ROLE_KEY } from "./permissions.js";
import type { Phone } from "./phone.js";
import { LastAdminError, UserDeletedError } from "./user.errors.js";

// The role's key ("admin", "moderator"); the row is resolved when saved
export type UserRole = string;
export type UserStatus = "active" | "disabled";

export const PASSWORD_PROVIDER = "password";

// One login method. A new identity has no id until saved.
export interface UserIdentity {
  id: bigint | null;
  provider: string;
  // For 'password' the user id as text, filled in by the repository on insert
  providerUserId: string | null;
  // Only for provider = 'password'
  passwordHash: string | null;
}

export interface UserProfile {
  displayName: string;
  shortName: string | null;
  givenName: string | null;
  familyName: string | null;
  // Parsed by the handler (parsePhone); null: none
  phone: Phone | null;
}

export interface UserProps extends UserProfile {
  id: bigint | null;
  email: Email;
  emailVerifiedAt: string | null;
  status: UserStatus;
  role: UserRole;
  deletedAt: string | null;
  identities: UserIdentity[];
}

// Aggregate root; owns its identities. Rules from ideas/users/index.md.
export class User {
  private constructor(private props: UserProps) {}

  static register(input: {
    email: Email;
    profile: UserProfile;
    passwordHash: string;
    role?: UserRole;
  }): User {
    return new User({
      id: null,
      email: input.email,
      emailVerifiedAt: null,
      ...input.profile,
      status: "active",
      role: input.role ?? DEFAULT_ROLE_KEY,
      deletedAt: null,
      identities: [
        {
          id: null,
          provider: PASSWORD_PROVIDER,
          providerUserId: null,
          passwordHash: input.passwordHash,
        },
      ],
    });
  }

  static restore(props: UserProps): User {
    return new User(props);
  }

  get id(): bigint | null {
    return this.props.id;
  }
  get email(): Email {
    return this.props.email;
  }
  get role(): UserRole {
    return this.props.role;
  }
  get status(): UserStatus {
    return this.props.status;
  }
  get isDeleted(): boolean {
    return this.props.deletedAt !== null;
  }
  // Disabled or deleted users cannot sign in or refresh
  get canSignIn(): boolean {
    return this.props.status === "active" && !this.isDeleted;
  }
  get isActiveAdmin(): boolean {
    return this.props.role === ADMIN_ROLE_KEY && this.canSignIn;
  }
  // Active, not deleted, with a password to reset (OAuth-only users can't:
  // a reset would add a first password to their account)
  get canResetPassword(): boolean {
    return this.canSignIn && this.passwordHash !== null;
  }
  // For greetings in email: the short name, else the full one
  get greetingName(): string {
    return this.props.shortName ?? this.props.displayName;
  }
  get passwordHash(): string | null {
    return (
      this.props.identities.find((i) => i.provider === PASSWORD_PROVIDER)
        ?.passwordHash ?? null
    );
  }

  snapshot(): Readonly<UserProps> {
    return this.props;
  }

  assignId(id: bigint): void {
    this.props.id = id;
  }

  updateProfile(profile: Partial<UserProfile>): void {
    this.assertNotDeleted();
    this.props = {
      ...this.props,
      ...profile,
    };
  }

  // `activeAdmins` counts active admins including this user
  changeRole(role: UserRole, activeAdmins: number): void {
    this.assertNotDeleted();
    if (this.isActiveAdmin && role !== ADMIN_ROLE_KEY) {
      this.assertNotLastAdmin(activeAdmins);
    }
    this.props.role = role;
  }

  changeStatus(status: UserStatus, activeAdmins: number): void {
    this.assertNotDeleted();
    if (this.isActiveAdmin && status !== "active") {
      this.assertNotLastAdmin(activeAdmins);
    }
    this.props.status = status;
  }

  changePassword(passwordHash: string): void {
    this.assertNotDeleted();
    const identity = this.props.identities.find(
      (i) => i.provider === PASSWORD_PROVIDER,
    );
    if (identity) {
      identity.passwordHash = passwordHash;
    } else {
      this.props.identities.push({
        id: null,
        provider: PASSWORD_PROVIDER,
        providerUserId: null,
        passwordHash,
      });
    }
  }

  // Keeps the row so posts and assets keep an owner, drops every login
  // method and scrubs personal data
  delete(activeAdmins: number, now: string): void {
    this.assertNotDeleted();
    if (this.isActiveAdmin) {
      this.assertNotLastAdmin(activeAdmins);
    }
    this.props = {
      ...this.props,
      email: Email.fromStored(`deleted-${this.props.id}@invalid`),
      emailVerifiedAt: null,
      displayName: "Deleted user",
      shortName: null,
      givenName: null,
      familyName: null,
      phone: null,
      deletedAt: now,
      identities: [],
    };
  }

  private assertNotDeleted(): void {
    if (this.isDeleted) {
      throw new UserDeletedError();
    }
  }

  private assertNotLastAdmin(activeAdmins: number): void {
    if (activeAdmins <= 1) {
      throw new LastAdminError();
    }
  }
}
