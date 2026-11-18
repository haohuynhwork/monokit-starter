import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { CurrencyNotFoundError } from "../../domain/geo.errors.js";
import { checkStaff } from "../../domain/geo.js";
import {
  CURRENCY_REPOSITORY,
  type CurrencyRepository,
} from "../../domain/locale.repository.js";
import { loadBaseCurrency } from "../base-currency.js";
import { DeleteCurrencyCommand } from "./delete-currency.command.js";

@CommandHandler(DeleteCurrencyCommand)
export class DeleteCurrencyHandler
  implements ICommandHandler<DeleteCurrencyCommand>
{
  constructor(
    @Inject(CURRENCY_REPOSITORY)
    private readonly currencies: CurrencyRepository,
    private readonly queries: QueryBus,
  ) {}

  async execute({ currencyId, actor }: DeleteCurrencyCommand): Promise<void> {
    checkStaff(actor);
    const currency = await this.currencies.findById(currencyId);
    if (!currency) {
      throw new CurrencyNotFoundError();
    }
    currency.checkDeletable(await loadBaseCurrency(this.queries));
    await this.currencies.delete(currencyId);
  }
}
