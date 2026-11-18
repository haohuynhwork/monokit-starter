import type { Currency } from "./currency.js";
import type { Locale } from "./locale.js";

// Code clashes throw CurrencyCodeTakenError / LocaleCodeTakenError.
// Both are hard-deleted: nothing stores a reference to them yet.

export interface CurrencyRepository {
  findById(id: bigint): Promise<Currency | null>;
  save(currency: Currency): Promise<void>;
  delete(id: bigint): Promise<void>;
}
export const CURRENCY_REPOSITORY = Symbol("CURRENCY_REPOSITORY");

export interface LocaleRepository {
  findById(id: bigint): Promise<Locale | null>;
  hasAny(): Promise<boolean>;
  // A default locale clears the previous default (same transaction)
  save(locale: Locale): Promise<void>;
  delete(id: bigint): Promise<void>;
}
export const LOCALE_REPOSITORY = Symbol("LOCALE_REPOSITORY");
