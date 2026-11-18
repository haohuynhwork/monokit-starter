import { DomainError } from "../../common/domain/domain-error.js";

export class InvalidCredentialsError extends DomainError {
  readonly code = "invalid_credentials";
  readonly kind = "unauthorized";
  constructor() {
    super("Invalid email or password");
  }
}

export class InvalidTokenError extends DomainError {
  readonly code = "invalid_token";
  readonly kind = "unauthorized";
  constructor() {
    super("Invalid or expired token");
  }
}

// One code for every bad link: expired, tampered, already used, or the
// account can no longer reset
export class InvalidResetTokenError extends DomainError {
  readonly code = "invalid_reset_token";
  readonly kind = "invalid";
  constructor() {
    super("This reset link is invalid or has expired; ask for a new one");
  }
}

export class SessionNotFoundError extends DomainError {
  readonly code = "session_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Session not found");
  }
}
