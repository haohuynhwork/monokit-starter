import { Query } from "@nestjs/cqrs";
import type { ConfigValues } from "../../domain/config-keys.js";

export type { ConfigValues };

// Every setting, defaults filled in. Other contexts read configs only
// through this query.
export class GetConfigQuery extends Query<ConfigValues> {}
