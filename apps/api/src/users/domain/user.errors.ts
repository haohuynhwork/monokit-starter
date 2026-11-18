import { DomainError } from "../../common/domain/domain-error.js";

export class UserNotFoundError extends DomainError {
  readonly code = "user_not_found";
  readonly kind = "not_found";
  constructor() {
    super("User not found");
  }
}

export class EmailTakenError extends DomainError {
  readonly code = "email_taken";
  readonly kind = "conflict";
  constructor() {
    super("Email is already in use");
  }
}

export class InvalidEmailError extends DomainError {
  readonly code = "invalid_email";
  readonly kind = "invalid";
  constructor() {
    super("Invalid email address");
  }
}

export class WeakPasswordError extends DomainError {
  readonly code = "weak_password";
  readonly kind = "invalid";
  constructor() {
    super("Password must be 8 to 256 characters");
  }
}

export class UserDeletedError extends DomainError {
  readonly code = "user_deleted";
  readonly kind = "conflict";
  constructor() {
    super("User is deleted");
  }
}

export class LastAdminError extends DomainError {
  readonly code = "last_admin";
  readonly kind = "conflict";
  constructor() {
    super("Cannot remove the last active admin");
  }
}

export class WrongPasswordError extends DomainError {
  readonly code = "wrong_password";
  readonly kind = "invalid";
  constructor() {
    super("Current password is wrong");
  }
}

export class InvalidPhoneError extends DomainError {
  readonly code = "invalid_phone";
  readonly kind = "invalid";
  constructor() {
    super("Invalid phone number for its country");
  }
}

export class RoleNotFoundError extends DomainError {
  readonly code = "role_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Role not found");
  }
}
