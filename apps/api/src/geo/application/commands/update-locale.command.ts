import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/geo.js";

// The code is fixed. isDefault: true moves the default here.
export class UpdateLocaleCommand extends Command<void> {
  constructor(
    readonly localeId: bigint,
    readonly input: {
      name?: string;
      nativeName?: string;
      rtl?: boolean;
      active?: boolean;
      isDefault?: boolean;
      position?: number;
    },
    readonly actor: Actor,
  ) {
    super();
  }
}
