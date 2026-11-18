import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { Currency } from "../../domain/currency.js";
import { checkStaff } from "../../domain/geo.js";
import {
  CURRENCY_REPOSITORY,
  type CurrencyRepository,
} from "../../domain/locale.repository.js";
import { loadBaseCurrency } from "../base-currency.js";
import { CreateCurrencyCommand } from "./create-currency.command.js";

@CommandHandler(CreateCurrencyCommand)
export class CreateCurrencyHandler
  implements ICommandHandler<CreateCurrencyCommand>
{
  constructor(
    @Inject(CURRENCY_REPOSITORY)
    private readonly currencies: CurrencyRepository,
    private readonly queries: QueryBus,
  ) {}

  async execute({ input, actor }: CreateCurrencyCommand): Promise<bigint> {
    checkStaff(actor);
    const currency = Currency.create(
      input,
      await loadBaseCurrency(this.queries),
      new Date(),
    );
    await this.currencies.save(currency);
    return currency.id!;
  }
}
