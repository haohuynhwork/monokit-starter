import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/geo.js";

// Refused for the base currency
export class DeleteCurrencyCommand extends Command<void> {
  constructor(
    readonly currencyId: bigint,
    readonly actor: Actor,
  ) {
    super();
  }
}
