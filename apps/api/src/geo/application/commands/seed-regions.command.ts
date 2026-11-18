import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/geo.js";

// Imports a country's top-level regions, by position in the given order;
// skipped (returns false) when the country already has any
export class SeedRegionsCommand extends Command<boolean> {
  constructor(
    readonly countryCode: string,
    readonly regions: {
      code: string;
      name: string;
    }[],
    readonly actor: Actor,
  ) {
    super();
  }
}
