import { createHash } from "node:crypto";
import { WeakPasswordError } from "./user.errors.js";

// A plain-text password that passed the policy; never stored or logged
export class Password {
  private constructor(readonly value: string) {}

  static parse(input: string): Password {
    if (input.length < 8 || input.length > 256) {
      throw new WeakPasswordError();
    }
    return new Password(input);
  }

  toJSON(): string {
    return "[redacted]";
  }
}

export interface PasswordHasher {
  hash(password: Password): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol("PASSWORD_HASHER");

// A short, one-way fingerprint of a stored hash. Reset links carry it, so
// any password change voids them (ideas/users/password-reset.md); it
// reveals nothing usable about the hash or the password.
export function passwordFingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}
