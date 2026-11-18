import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/geo.js";

// The code is fixed; changing the rate stamps rateAt
export class UpdateCurrencyCommand extends Command<void> {
  constructor(
    readonly currencyId: bigint,
    readonly input: {
      name?: string;
      symbol?: string;
      decimals?: number;
      rate?: string;
      active?: boolean;
      position?: number;
    },
    readonly actor: Actor,
  ) {
    super();
  }
}
