import type { QueryBus } from "@nestjs/cqrs";
import { isCountry } from "@packages/geo";
import { GetConfigQuery } from "../../configs/application/queries/get-config.query.js";
import { FindRegionQuery } from "../../geo/application/queries/find-region.query.js";
import type { AddressRules } from "../domain/address.js";

// The domain's address rules: allowed countries from configs, countries from
// @packages/geo, regions from the Region table. regionCode is the one the
// address will have (looked up up front: the domain's check is sync);
// keepCode is the one it has now, still accepted after being deactivated.
export async function loadAddressRules(
  queries: QueryBus,
  regionCode: string | null | undefined,
  keepCode: string | null = null,
): Promise<AddressRules> {
  const code = regionCode?.trim().toUpperCase() || null;
  const [config, region] = await Promise.all([
    queries.execute(new GetConfigQuery()),
    code ? queries.execute(new FindRegionQuery(code)) : null,
  ]);
  return {
    allowedCountries: config["shipping.countries"],
    isCountry,
    regionName: (wanted, countryCode) =>
      region &&
      wanted === code &&
      region.countryCode === countryCode &&
      (region.active || wanted === keepCode)
        ? region.name
        : undefined,
  };
}
