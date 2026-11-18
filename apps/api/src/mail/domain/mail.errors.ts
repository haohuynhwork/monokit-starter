import { DomainError } from "../../common/domain/domain-error.js";

export class MailNotConfiguredError extends DomainError {
  readonly code = "mail_not_configured";
  readonly kind = "conflict";
  constructor() {
    super('Email is off: set "Outgoing email" in Settings.');
  }
}

export class MailDeliveryError extends DomainError {
  readonly code = "mail_delivery_failed";
  readonly kind = "conflict";
  constructor(reason: string) {
    super(`The email wasn't accepted: ${reason}`);
  }
}

export class InvalidRecipientError extends DomainError {
  readonly code = "invalid_recipient";
  readonly kind = "invalid";
  constructor(to: string) {
    super(`"${to}" is not an email address.`);
  }
}
