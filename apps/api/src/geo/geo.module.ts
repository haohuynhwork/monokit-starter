import { Module } from "@nestjs/common";
import { CreateCurrencyHandler } from "./application/commands/create-currency.handler.js";
import { CreateLocaleHandler } from "./application/commands/create-locale.handler.js";
import { CreateRegionHandler } from "./application/commands/create-region.handler.js";
import { DeleteCurrencyHandler } from "./application/commands/delete-currency.handler.js";
import { DeleteLocaleHandler } from "./application/commands/delete-locale.handler.js";
import { DeleteRegionHandler } from "./application/commands/delete-region.handler.js";
import { SeedRegionsHandler } from "./application/commands/seed-regions.handler.js";
import { UpdateCurrencyHandler } from "./application/commands/update-currency.handler.js";
import { UpdateLocaleHandler } from "./application/commands/update-locale.handler.js";
import { UpdateRegionHandler } from "./application/commands/update-region.handler.js";
import { FindRegionHandler } from "./application/queries/find-region.handler.js";
import { GetRegionHandler } from "./application/queries/get-region.handler.js";
import { ListCurrenciesHandler } from "./application/queries/list-currencies.handler.js";
import { ListLocalesHandler } from "./application/queries/list-locales.handler.js";
import { ListRegionsHandler } from "./application/queries/list-regions.handler.js";
import { ResolveLocaleHandler } from "./application/queries/resolve-locale.handler.js";
import {
  CURRENCY_REPOSITORY,
  LOCALE_REPOSITORY,
} from "./domain/locale.repository.js";
import { REGION_REPOSITORY } from "./domain/region.repository.js";
import { GeoResolver } from "./graphql/geo.resolver.js";
import { PublicGeoResolver } from "./graphql/public-geo.resolver.js";
import { CurrenciesController } from "./http/currencies.controller.js";
import { LocalesController } from "./http/locales.controller.js";
import { PublicLocalesController } from "./http/public-locales.controller.js";
import { PublicRegionsController } from "./http/public-regions.controller.js";
import { RegionsController } from "./http/regions.controller.js";
import { PrismaCurrencyRepository } from "./infrastructure/prisma-currency.repository.js";
import { PrismaLocaleRepository } from "./infrastructure/prisma-locale.repository.js";
import { PrismaRegionRepository } from "./infrastructure/prisma-region.repository.js";

// Reference data: regions (the address pick list), currencies with rates
// and the site's locales. Other contexts read it
// through FindRegionQuery / ListRegionsQuery, and resolve a request's
// locale with ResolveLocaleQuery.
@Module({
  controllers: [
    RegionsController,
    PublicRegionsController,
    CurrenciesController,
    LocalesController,
    PublicLocalesController,
  ],
  providers: [
    {
      provide: REGION_REPOSITORY,
      useClass: PrismaRegionRepository,
    },
    {
      provide: CURRENCY_REPOSITORY,
      useClass: PrismaCurrencyRepository,
    },
    {
      provide: LOCALE_REPOSITORY,
      useClass: PrismaLocaleRepository,
    },
    CreateRegionHandler,
    UpdateRegionHandler,
    DeleteRegionHandler,
    SeedRegionsHandler,
    ListRegionsHandler,
    GetRegionHandler,
    FindRegionHandler,
    CreateCurrencyHandler,
    UpdateCurrencyHandler,
    DeleteCurrencyHandler,
    ListCurrenciesHandler,
    CreateLocaleHandler,
    UpdateLocaleHandler,
    DeleteLocaleHandler,
    ListLocalesHandler,
    ResolveLocaleHandler,
    GeoResolver,
    PublicGeoResolver,
  ],
})
export class GeoModule {}
