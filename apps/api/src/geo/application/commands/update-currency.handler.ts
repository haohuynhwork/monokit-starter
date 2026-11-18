import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { CurrencyNotFoundError } from "../../domain/geo.errors.js";
import { checkStaff } from "../../domain/geo.js";
import {
  CURRENCY_REPOSITORY,
  type CurrencyRepository,
} from "../../domain/locale.repository.js";
import { loadBaseCurrency } from "../base-currency.js";
import { UpdateCurrencyCommand } from "./update-currency.command.js";

@CommandHandler(UpdateCurrencyCommand)
export class UpdateCurrencyHandler
  implements ICommandHandler<UpdateCurrencyCommand>
{
  constructor(
    @Inject(CURRENCY_REPOSITORY)
    private readonly currencies: CurrencyRepository,
    private readonly queries: QueryBus,
  ) {}

  async execute({
    currencyId,
    input,
    actor,
  }: UpdateCurrencyCommand): Promise<void> {
    checkStaff(actor);
    const currency = await this.currencies.findById(currencyId);
    if (!currency) {
      throw new CurrencyNotFoundError();
    }
    currency.update(input, await loadBaseCurrency(this.queries), new Date());
    await this.currencies.save(currency);
  }
}
