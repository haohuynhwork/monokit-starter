import { DomainError } from "../../common/domain/domain-error.js";

export class InvalidGeoInputError extends DomainError {
  readonly code = "invalid_geo_input";
  readonly kind = "invalid";
}

export class GeoForbiddenError extends DomainError {
  readonly code = "geo_forbidden";
  readonly kind = "forbidden";
  constructor() {
    super("Only editors and admins manage regions");
  }
}

export class RegionNotFoundError extends DomainError {
  readonly code = "region_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Region not found");
  }
}

export class RegionCodeTakenError extends DomainError {
  readonly code = "region_code_taken";
  readonly kind = "conflict";
  constructor() {
    super("Another region already has this code");
  }
}

export class RegionCycleError extends DomainError {
  readonly code = "region_cycle";
  readonly kind = "conflict";
  constructor() {
    super("A region cannot be moved under itself or its children");
  }
}

export class RegionInUseError extends DomainError {
  readonly code = "region_in_use";
  readonly kind = "conflict";
  constructor() {
    super("Addresses or subregions use it; deactivate it instead");
  }
}

export class CurrencyNotFoundError extends DomainError {
  readonly code = "currency_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Currency not found");
  }
}

export class CurrencyCodeTakenError extends DomainError {
  readonly code = "currency_code_taken";
  readonly kind = "conflict";
  constructor() {
    super("This currency is already listed");
  }
}

export class BaseCurrencyLockedError extends DomainError {
  readonly code = "base_currency_locked";
  readonly kind = "conflict";
  constructor(action: string) {
    super(
      `The base currency (Settings → Currency) cannot be ${action}; its rate is always 1`,
    );
  }
}

export class LocaleNotFoundError extends DomainError {
  readonly code = "locale_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Locale not found");
  }
}

export class LocaleCodeTakenError extends DomainError {
  readonly code = "locale_code_taken";
  readonly kind = "conflict";
  constructor() {
    super("This locale is already listed");
  }
}

export class DefaultLocaleLockedError extends DomainError {
  readonly code = "default_locale_locked";
  readonly kind = "conflict";
  constructor(action: string) {
    super(
      `The default locale cannot be ${action}; make another one default first`,
    );
  }
}
