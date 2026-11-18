import { Injectable } from "@nestjs/common";
import { hash, verify } from "@node-rs/argon2";
import type { Password, PasswordHasher } from "../domain/password.js";

// Argon2id with the library defaults (m=19 MiB, t=2, p=1, OWASP minimum)
@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  hash(password: Password): Promise<string> {
    return hash(password.value);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}
