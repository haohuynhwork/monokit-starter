import type { QueryBus } from "@nestjs/cqrs";
import { GetRegionQuery } from "../application/queries/get-region.query.js";
import { ListCurrenciesQuery } from "../application/queries/list-currencies.query.js";
import { ListLocalesQuery } from "../application/queries/list-locales.query.js";
import { ListRegionsQuery } from "../application/queries/list-regions.query.js";
import type {
  CurrencyView,
  LocaleView,
} from "../application/queries/locale.view.js";
import type { RegionView } from "../application/queries/region.view.js";
import {
  CurrencyNotFoundError,
  LocaleNotFoundError,
  RegionNotFoundError,
} from "../domain/geo.errors.js";
import type { ListRegionsDto } from "./geo.dto.js";

// Shared by the REST controllers and the GraphQL resolvers

export function listRegionsQuery(
  query: ListRegionsDto,
  activeOnly: boolean,
): ListRegionsQuery {
  return new ListRegionsQuery({
    countryCode: query.country,
    parentId: query.parentId === "root" ? null : query.parentId,
    activeOnly,
  });
}

export async function getRegion(
  queries: QueryBus,
  id: bigint,
): Promise<RegionView> {
  const view = await queries.execute(new GetRegionQuery(id));
  if (!view) {
    throw new RegionNotFoundError();
  }
  return view;
}

// Staff view of one currency, inactive included
export async function getCurrency(
  queries: QueryBus,
  id: bigint,
): Promise<CurrencyView> {
  const all = await queries.execute(new ListCurrenciesQuery(false));
  const found = all.items.find((x) => x.id === String(id));
  if (!found) {
    throw new CurrencyNotFoundError();
  }
  return found;
}

// Staff view of one locale, inactive included
export async function getLocale(
  queries: QueryBus,
  id: bigint,
): Promise<LocaleView> {
  const all = await queries.execute(new ListLocalesQuery(false));
  const found = all.find((x) => x.id === String(id));
  if (!found) {
    throw new LocaleNotFoundError();
  }
  return found;
}
