import { Query, type QueryBus } from "@nestjs/cqrs";
import { UnknownLocaleError } from "../../../common/domain/translation.js";

export interface ResolvedLocale {
  id: bigint;
  code: string;
  rtl: boolean;
  isDefault: boolean;
  // The default locale: the fallback for missing translations
  defaultId: bigint;
  defaultCode: string;
}

// The active locale best matching `tags` (best first, e.g. from
// @RequestLocale()); exact code first, then the language part ("vi" ->
// "vi-VN"); none: the default. Used by every context that reads translations.
export class ResolveLocaleQuery extends Query<ResolvedLocale> {
  constructor(readonly tags: readonly string[] = []) {
    super();
  }
}

// An active locale by its exact code (case-insensitive), for staff writes:
// no fallback, unlike ResolveLocaleQuery
export async function findActiveLocale(
  queries: QueryBus,
  code: string,
): Promise<ResolvedLocale> {
  const locale = await queries.execute(
    new ResolveLocaleQuery([
      code,
    ]),
  );
  if (locale.code.toLowerCase() !== code.toLowerCase()) {
    throw new UnknownLocaleError(code);
  }
  return locale;
}
