import type { AuditEntry } from "../../common/domain/audit-entry.js";
import type { Email } from "./email.js";
import type { User } from "./user.js";

export interface UserRepository {
  // Non-deleted only
  findById(id: bigint): Promise<User | null>;
  // Case-insensitive, non-deleted only
  findByEmail(email: Email): Promise<User | null>;
  countActiveAdmins(): Promise<number>;
  // Inserts a new user (and assigns its id) or updates an existing one. An
  // `audit` entry is written in the same transaction: a guaranteed row.
  save(user: User, audit?: AuditEntry): Promise<void>;
}

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
