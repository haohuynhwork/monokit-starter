import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import {
  ApiFailResponse,
  ApiZodBody,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { CreateCurrencyCommand } from "../application/commands/create-currency.command.js";
import { DeleteCurrencyCommand } from "../application/commands/delete-currency.command.js";
import { UpdateCurrencyCommand } from "../application/commands/update-currency.command.js";
import { ListCurrenciesQuery } from "../application/queries/list-currencies.query.js";
import type {
  CurrenciesView,
  CurrencyView,
} from "../application/queries/locale.view.js";
import {
  type CreateCurrencyDto,
  createCurrencySchema,
  currenciesViewSchema,
  currencyViewSchema,
  type UpdateCurrencyDto,
  updateCurrencySchema,
} from "./geo.dto.js";
import { getCurrency } from "./geo.lookup.js";

// Staff manage currencies and their rates; prices stay in the base currency
// (config shop.currency), whose rate is always 1
@ApiTags("geo")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@ApiFailResponse(403, "Not an editor or admin")
@RequirePermission("geo:manage")
@Controller("currencies")
export class CurrenciesController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "All currencies, inactive included",
  })
  @ApiZodResponse(currenciesViewSchema)
  list(): Promise<CurrenciesView> {
    return this.queries.execute(new ListCurrenciesQuery(false));
  }

  @Post()
  @ApiOperation({
    summary: "Add a currency",
  })
  @ApiZodBody(createCurrencySchema)
  @ApiZodResponse(currencyViewSchema, {
    status: 201,
  })
  @ApiFailResponse(409, "Already listed")
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createCurrencySchema)) body: CreateCurrencyDto,
  ): Promise<CurrencyView> {
    const id = await this.commands.execute(
      new CreateCurrencyCommand(body, user),
    );
    return getCurrency(this.queries, id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Rename, set the rate, (de)activate or reorder; the code is fixed",
  })
  @ApiZodBody(updateCurrencySchema)
  @ApiZodResponse(currencyViewSchema)
  @ApiFailResponse(409, "refused for the base currency")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(updateCurrencySchema)) body: UpdateCurrencyDto,
  ): Promise<CurrencyView> {
    await this.commands.execute(new UpdateCurrencyCommand(id, body, user));
    return getCurrency(this.queries, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete (refused for the base currency)",
  })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(new DeleteCurrencyCommand(id, user));
  }
}
