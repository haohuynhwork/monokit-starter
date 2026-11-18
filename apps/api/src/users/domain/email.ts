import { InvalidEmailError } from "./user.errors.js";

// Stored as entered; compared case-insensitively (see users_email_unique)
export class Email {
  private constructor(readonly value: string) {}

  static parse(input: string): Email {
    const value = input.trim();
    if (value.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new InvalidEmailError();
    }
    return new Email(value);
  }

  // Rows loaded from the db were validated on the way in
  static fromStored(value: string): Email {
    return new Email(value);
  }

  get normalized(): string {
    return this.value.toLowerCase();
  }
}
