import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/geo.js";

// Refused for the default locale
export class DeleteLocaleCommand extends Command<void> {
  constructor(
    readonly localeId: bigint,
    readonly actor: Actor,
  ) {
    super();
  }
}
