import { DomainError } from "./domain-error.js";

// Shared by every context with translated content (ideas/i18n/index.md):
// the base row holds the default locale, translations the others.

// The locale a translation is written in, as resolved by geo
export interface TranslationLocale {
  id: bigint;
  isDefault: boolean;
}

export class UnknownLocaleError extends DomainError {
  readonly code = "unknown_locale";
  readonly kind = "not_found";
  constructor(code: string) {
    super(`No active locale "${code}"`);
  }
}

export class DefaultLocaleTranslationError extends DomainError {
  readonly code = "default_locale_translation";
  readonly kind = "invalid";
  constructor() {
    super("The default locale is the item itself; edit it instead");
  }
}

export function checkTranslatable(locale: TranslationLocale): void {
  if (locale.isDefault) {
    throw new DefaultLocaleTranslationError();
  }
}
