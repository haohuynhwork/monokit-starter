import { Controller, Get } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/http/guards/auth.decorators.js";
import { ApiZodResponse } from "../../common/http/setup/openapi.js";
import { ListCurrenciesQuery } from "../application/queries/list-currencies.query.js";
import { ListLocalesQuery } from "../application/queries/list-locales.query.js";
import type {
  CurrenciesView,
  LocaleView,
} from "../application/queries/locale.view.js";
import { currenciesViewSchema, localeViewSchema } from "./geo.dto.js";

// For switchers on the site: active entries only, no sign-in
@ApiTags("public")
@Public()
@Controller("public")
export class PublicLocalesController {
  constructor(private readonly queries: QueryBus) {}

  @Get("currencies")
  @ApiOperation({
    summary: "Active currencies with their rates",
  })
  @ApiZodResponse(currenciesViewSchema)
  currencies(): Promise<CurrenciesView> {
    return this.queries.execute(new ListCurrenciesQuery(true));
  }

  @Get("locales")
  @ApiOperation({
    summary: "Active locales, default first",
  })
  @ApiZodResponse(localeViewSchema.array())
  locales(): Promise<LocaleView[]> {
    return this.queries.execute(new ListLocalesQuery(true));
  }
}
