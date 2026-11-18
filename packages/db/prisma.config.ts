import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";
import { definePrismaConfig } from "prisma/config";

export default definePrismaConfig({
  skills: {
    agents: [],
  },
  orm: ormConfig({
    contract: "./src/prisma/**/*.prisma",
    db: {
      connection: process.env.DATABASE_URL!,
    },
  }),
});
