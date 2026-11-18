import type { QueryBus } from "@nestjs/cqrs";
import { GetConfigQuery } from "../../configs/application/queries/get-config.query.js";

// The currency prices are stored in (config shop.currency)
export async function loadBaseCurrency(queries: QueryBus): Promise<string> {
  const config = await queries.execute(new GetConfigQuery());
  return config["shop.currency"];
}
