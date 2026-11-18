import { QueryBus } from "@nestjs/cqrs";
import { Args, Query, Resolver } from "@nestjs/graphql";
import { Public } from "../../common/http/guards/auth.decorators.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { ListCurrenciesQuery } from "../application/queries/list-currencies.query.js";
import { ListLocalesQuery } from "../application/queries/list-locales.query.js";
import type {
  CurrenciesView,
  LocaleView,
} from "../application/queries/locale.view.js";
import type { RegionView } from "../application/queries/region.view.js";
import { listRegionsSchema } from "../http/geo.dto.js";
import { listRegionsQuery } from "../http/geo.lookup.js";
import { CurrenciesModel, LocaleModel, RegionModel } from "./geo.model.js";

const listArgs = new ZodValidationPipe(listRegionsSchema);

// Same reads as PublicRegionsController and PublicLocalesController:
// active entries only, no sign-in
@Public()
@Resolver()
export class PublicGeoResolver {
  constructor(private readonly queries: QueryBus) {}

  @Query(
    () => [
      RegionModel,
    ],
    {
      description: "A country's active regions (the address picker)",
    },
  )
  regions(
    @Args("country", {
      type: () => String,
      description: "2-letter country code, e.g. VN",
    })
    country: string,
    @Args("parentId", {
      type: () => String,
      nullable: true,
      description: "Omit for every level (flat); 'root' for the top level only",
    })
    parentId?: string,
  ): Promise<RegionView[]> {
    return this.queries.execute(
      listRegionsQuery(
        listArgs.transform({
          country,
          parentId: parentId ?? undefined,
        }),
        true,
      ),
    );
  }

  @Query(() => CurrenciesModel, {
    description: "Active currencies with their rates",
  })
  currencies(): Promise<CurrenciesView> {
    return this.queries.execute(new ListCurrenciesQuery(true));
  }

  @Query(
    () => [
      LocaleModel,
    ],
    {
      description: "Active locales, default first",
    },
  )
  locales(): Promise<LocaleView[]> {
    return this.queries.execute(new ListLocalesQuery(true));
  }
}
