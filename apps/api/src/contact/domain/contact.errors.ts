import { DomainError } from "../../common/domain/domain-error.js";

export class InvalidContactMessageError extends DomainError {
  readonly code = "invalid_contact_message";
  readonly kind = "invalid";
}

export class ContactMessageNotFoundError extends DomainError {
  readonly code = "contact_message_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Message not found");
  }
}
