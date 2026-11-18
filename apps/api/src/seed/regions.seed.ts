import { Logger } from "@nestjs/common";
import type { CommandBus } from "@nestjs/cqrs";
import { COUNTRIES, subdivisions } from "@packages/geo";
import { SeedRegionsCommand } from "../geo/application/commands/seed-regions.command.js";
import type { Actor } from "../geo/domain/geo.js";
import { ADMIN_PERMISSIONS } from "../users/domain/permissions.js";

const SYSTEM: Actor = {
  id: 0n,
  permissions: ADMIN_PERMISSIONS,
};

// Idempotent: a country that already has regions is left alone, so staff
// edits (e.g. VN's 2025 provinces) survive re-seeding
export async function seedRegions(commands: CommandBus): Promise<void> {
  let seeded = 0;
  for (const country of COUNTRIES) {
    if (
      await commands.execute(
        new SeedRegionsCommand(country, subdivisions(country), SYSTEM),
      )
    ) {
      seeded++;
    }
  }
  new Logger("seed").log(`Regions: ${seeded} countries imported`);
}
