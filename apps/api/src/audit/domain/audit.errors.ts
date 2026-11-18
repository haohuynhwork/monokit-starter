import { DomainError } from "../../common/domain/domain-error.js";

export class InvalidAuditCursorError extends DomainError {
  readonly code = "invalid_cursor";
  readonly kind = "invalid";
  constructor() {
    super("Invalid cursor.");
  }
}
