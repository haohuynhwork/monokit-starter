import { DomainError } from "../../common/domain/domain-error.js";

export class UnknownConfigKeyError extends DomainError {
  readonly code = "unknown_config_key";
  readonly kind = "not_found";
  constructor(key: string) {
    super(`There is no setting "${key}".`);
  }
}

export class InvalidConfigValueError extends DomainError {
  readonly code = "invalid_config_value";
  readonly kind = "invalid";
  constructor(key: string, reason: string) {
    super(`Invalid value for "${key}": ${reason}`);
  }
}

export class ConfigSecretMissingError extends DomainError {
  readonly code = "config_secret_missing";
  readonly kind = "conflict";
  constructor(key: string) {
    super(`"${key}" is stored encrypted, but the server has no APP_SECRET.`);
  }
}
