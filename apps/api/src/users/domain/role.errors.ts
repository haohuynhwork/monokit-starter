import { DomainError } from "../../common/domain/domain-error.js";

export class RoleKeyTakenError extends DomainError {
  readonly code = "role_key_taken";
  readonly kind = "conflict";
  constructor() {
    super("A role with this key already exists");
  }
}

export class InvalidRoleError extends DomainError {
  readonly code = "invalid_role";
  readonly kind = "invalid";
  constructor(message: string) {
    super(message);
  }
}

export class UnknownPermissionError extends DomainError {
  readonly code = "unknown_permission";
  readonly kind = "invalid";
  constructor(key: string) {
    super(`Unknown permission: ${key}`);
  }
}

export class SystemRoleError extends DomainError {
  readonly code = "system_role";
  readonly kind = "forbidden";
  constructor() {
    super("Built-in roles can't be changed or deleted");
  }
}

export class RoleInUseError extends DomainError {
  readonly code = "role_in_use";
  readonly kind = "conflict";
  constructor() {
    super("Users still have this role; give them another one first");
  }
}
