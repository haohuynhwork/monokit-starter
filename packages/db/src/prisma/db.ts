import postgres, { type PostgresClient } from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";

import "temporal-polyfill/global";

import type { Contract } from "./contract";
import contractJson from "./contract.json" with { type: "json" };

export const contract = contractFromJson<Contract>(contractJson);

export const db: PostgresClient<Contract> = process.env.DATABASE_URL
  ? postgres({
      contract,
      url: process.env.DATABASE_URL,
    })
  : postgres({
      contract,
    });

let connection: Promise<void> | undefined;

export function connectDatabase(): Promise<void> {
  connection ??= db
    .connect()
    .then(() => undefined)
    .catch((error: unknown) => {
      connection = undefined;
      throw error;
    });
  return connection;
}

// Closes the pool and forgets the connection, so a later connectDatabase()
// (e.g. the next e2e test app) connects again
export async function closeDatabase(): Promise<void> {
  connection = undefined;
  await db.close();
}
