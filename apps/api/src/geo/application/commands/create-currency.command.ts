import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/geo.js";

export class CreateCurrencyCommand extends Command<bigint> {
  constructor(
    readonly input: {
      code: string;
      name: string;
      symbol?: string;
      decimals?: number;
      rate: string;
      position?: number;
    },
    readonly actor: Actor,
  ) {
    super();
  }
}
