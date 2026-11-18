import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import {
  type ResolvedLocale,
  ResolveLocaleQuery,
} from "./resolve-locale.query.js";

interface Row {
  id: bigint;
  code: string;
  rtl: boolean;
  isDefault: boolean;
}

// Locales change rarely; a short cache saves a query per public request
const TTL_MS = 30_000;

@QueryHandler(ResolveLocaleQuery)
export class ResolveLocaleHandler implements IQueryHandler<ResolveLocaleQuery> {
  private cache?: {
    at: number;
    rows: Row[];
  };

  constructor(@InjectDb() private readonly db: Db) {}

  async execute({ tags }: ResolveLocaleQuery): Promise<ResolvedLocale> {
    return pickLocale(tags, await this.active());
  }

  private async active(): Promise<Row[]> {
    if (this.cache && Date.now() - this.cache.at < TTL_MS) {
      return this.cache.rows;
    }
    const rows = await this.db.orm.public.Locale.select(
      "id",
      "code",
      "rtl",
      "isDefault",
    )
      .where({
        active: true,
      })
      .orderBy((l) => l.position.asc())
      .limit(500)
      .all();
    this.cache = {
      at: Date.now(),
      rows,
    };
    return rows;
  }
}

// 'und' is BCP 47 for "undetermined"; id 0 matches no translation row
const NO_LOCALE: ResolvedLocale = {
  id: 0n,
  code: "und",
  rtl: false,
  isDefault: true,
  defaultId: 0n,
  defaultCode: "und",
};

export function pickLocale(
  tags: readonly string[],
  locales: readonly Row[],
): ResolvedLocale {
  const fallback = locales.find((l) => l.isDefault) ?? locales[0];
  if (!fallback) {
    // No locales set up yet: everything is the (only) default text
    return NO_LOCALE;
  }
  const lower = (s: string) => s.toLowerCase();
  const language = (s: string) => lower(s).split("-")[0];
  const found =
    tags
      .map((t) => locales.find((l) => lower(l.code) === lower(t)))
      .find(Boolean) ??
    tags
      .map((t) => locales.find((l) => language(l.code) === language(t)))
      .find(Boolean) ??
    fallback;
  return {
    id: found.id,
    code: found.code,
    rtl: found.rtl,
    isDefault: found.id === fallback.id,
    defaultId: fallback.id,
    defaultCode: fallback.code,
  };
}
