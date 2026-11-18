import { NestFactory } from "@nestjs/core";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { seedLocales } from "./locales.seed.js";
import { seedPages } from "./pages.seed.js";
import { seedRegions } from "./regions.seed.js";
import { SeedModule } from "./seed.module.js";
import { seedShop } from "./shop.seed.js";
import { seedUsers } from "./users.seed.js";

// Seeds through the CommandBus, so seeded data follows the domain rules.
// Run with `make seed` (or `pnpm seed` in apps/api).
async function seed() {
  const password = process.env.SEED_PASSWORD;
  if (!password) {
    throw new Error("SEED_PASSWORD must be set");
  }

  const app = await NestFactory.createApplicationContext(SeedModule);
  try {
    await seedUsers(app.get(CommandBus), password);
    await seedRegions(app.get(CommandBus));
    await seedLocales(app.get(CommandBus), app.get(QueryBus));
    await seedShop(app.get(CommandBus), app.get(QueryBus));
    await seedPages(app.get(CommandBus), app.get(QueryBus));
  } finally {
    // Closes the db pool so the process exits
    await app.close();
  }
}
await seed();
