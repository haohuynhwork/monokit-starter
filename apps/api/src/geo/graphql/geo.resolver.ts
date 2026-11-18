import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { CreateCurrencyCommand } from "../application/commands/create-currency.command.js";
import { CreateLocaleCommand } from "../application/commands/create-locale.command.js";
import { CreateRegionCommand } from "../application/commands/create-region.command.js";
import { DeleteCurrencyCommand } from "../application/commands/delete-currency.command.js";
import { DeleteLocaleCommand } from "../application/commands/delete-locale.command.js";
import { DeleteRegionCommand } from "../application/commands/delete-region.command.js";
import { UpdateCurrencyCommand } from "../application/commands/update-currency.command.js";
import { UpdateLocaleCommand } from "../application/commands/update-locale.command.js";
import { UpdateRegionCommand } from "../application/commands/update-region.command.js";
import { ListCurrenciesQuery } from "../application/queries/list-currencies.query.js";
import { ListLocalesQuery } from "../application/queries/list-locales.query.js";
import type {
  CurrenciesView,
  CurrencyView,
  LocaleView,
} from "../application/queries/locale.view.js";
import type { RegionView } from "../application/queries/region.view.js";
import {
  type CreateCurrencyDto,
  type CreateLocaleDto,
  type CreateRegionDto,
  createCurrencySchema,
  createLocaleSchema,
  createRegionSchema,
  listRegionsSchema,
  type UpdateCurrencyDto,
  type UpdateLocaleDto,
  type UpdateRegionDto,
  updateCurrencySchema,
  updateLocaleSchema,
  updateRegionSchema,
} from "../http/geo.dto.js";
import {
  getCurrency,
  getLocale,
  getRegion,
  listRegionsQuery,
} from "../http/geo.lookup.js";
import {
  CreateCurrencyInput,
  CreateLocaleInput,
  CreateRegionInput,
  CurrenciesModel,
  CurrencyModel,
  LocaleModel,
  RegionModel,
  UpdateCurrencyInput,
  UpdateLocaleInput,
  UpdateRegionInput,
} from "./geo.model.js";

const listArgs = new ZodValidationPipe(listRegionsSchema);
const idArg = {
  type: () => ID,
} as const;

// Same as RegionsController, CurrenciesController and LocalesController:
// staff manage the reference data, inactive entries included
@RequirePermission("geo:manage")
@Resolver()
export class GeoResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  // --- Regions ---

  @Query(
    () => [
      RegionModel,
    ],
    {
      description: "A country's regions, inactive included",
    },
  )
  allRegions(
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
        false,
      ),
    );
  }

  @Mutation(() => RegionModel, {
    description: "Add a region",
  })
  async createRegion(
    @CurrentUser() user: AuthUser,
    @Args(
      "input",
      {
        type: () => CreateRegionInput,
      },
      new ZodValidationPipe(createRegionSchema),
    )
    input: CreateRegionDto,
  ): Promise<RegionView> {
    const id = await this.commands.execute(
      new CreateRegionCommand(input, user),
    );
    return getRegion(this.queries, id);
  }

  @Mutation(() => RegionModel, {
    description:
      "Rename, reorder, move or (de)activate a region; the code is fixed",
  })
  async updateRegion(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args(
      "input",
      {
        type: () => UpdateRegionInput,
      },
      new ZodValidationPipe(updateRegionSchema),
    )
    input: UpdateRegionDto,
  ): Promise<RegionView> {
    await this.commands.execute(new UpdateRegionCommand(id, input, user));
    return getRegion(this.queries, id);
  }

  @Mutation(() => Boolean, {
    description: "Delete (refused while addresses or subregions use it)",
  })
  async deleteRegion(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new DeleteRegionCommand(id, user));
    return true;
  }

  // --- Currencies ---

  @Query(() => CurrenciesModel, {
    description: "All currencies, inactive included",
  })
  allCurrencies(): Promise<CurrenciesView> {
    return this.queries.execute(new ListCurrenciesQuery(false));
  }

  @Mutation(() => CurrencyModel, {
    description: "Add a currency",
  })
  async createCurrency(
    @CurrentUser() user: AuthUser,
    @Args(
      "input",
      {
        type: () => CreateCurrencyInput,
      },
      new ZodValidationPipe(createCurrencySchema),
    )
    input: CreateCurrencyDto,
  ): Promise<CurrencyView> {
    const id = await this.commands.execute(
      new CreateCurrencyCommand(input, user),
    );
    return getCurrency(this.queries, id);
  }

  @Mutation(() => CurrencyModel, {
    description:
      "Rename, set the rate, (de)activate or reorder; the code is fixed",
  })
  async updateCurrency(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args(
      "input",
      {
        type: () => UpdateCurrencyInput,
      },
      new ZodValidationPipe(updateCurrencySchema),
    )
    input: UpdateCurrencyDto,
  ): Promise<CurrencyView> {
    await this.commands.execute(new UpdateCurrencyCommand(id, input, user));
    return getCurrency(this.queries, id);
  }

  @Mutation(() => Boolean, {
    description: "Delete (refused for the base currency)",
  })
  async deleteCurrency(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new DeleteCurrencyCommand(id, user));
    return true;
  }

  // --- Locales ---

  @Query(
    () => [
      LocaleModel,
    ],
    {
      description: "All locales, inactive included; default first",
    },
  )
  allLocales(): Promise<LocaleView[]> {
    return this.queries.execute(new ListLocalesQuery(false));
  }

  @Mutation(() => LocaleModel, {
    description: "Add a locale",
  })
  async createLocale(
    @CurrentUser() user: AuthUser,
    @Args(
      "input",
      {
        type: () => CreateLocaleInput,
      },
      new ZodValidationPipe(createLocaleSchema),
    )
    input: CreateLocaleDto,
  ): Promise<LocaleView> {
    const id = await this.commands.execute(
      new CreateLocaleCommand(input, user),
    );
    return getLocale(this.queries, id);
  }

  @Mutation(() => LocaleModel, {
    description:
      "Rename, (de)activate, make default or reorder; the code is fixed",
  })
  async updateLocale(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args(
      "input",
      {
        type: () => UpdateLocaleInput,
      },
      new ZodValidationPipe(updateLocaleSchema),
    )
    input: UpdateLocaleDto,
  ): Promise<LocaleView> {
    await this.commands.execute(new UpdateLocaleCommand(id, input, user));
    return getLocale(this.queries, id);
  }

  @Mutation(() => Boolean, {
    description: "Delete (refused for the default locale)",
  })
  async deleteLocale(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new DeleteLocaleCommand(id, user));
    return true;
  }
}
