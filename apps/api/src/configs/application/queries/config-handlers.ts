import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { type Db, InjectDb } from "@packages/nest";
import { maskSecrets } from "../../domain/config.js";
import {
  CONFIG_CIPHER,
  type ConfigCipher,
} from "../../domain/config-cipher.js";
import {
  CONFIG_KEYS,
  type ConfigValues,
  defaults,
  isConfigKey,
} from "../../domain/config-keys.js";
import { unseal } from "../../infrastructure/sealed-value.js";
import { GetConfigQuery } from "./get-config.query.js";
import { GetPublicConfigsQuery } from "./get-public-configs.query.js";
import { type ConfigView, ListConfigsQuery } from "./list-configs.query.js";

// Small table (one row per set key), so every read loads all of it.
// Values come back decrypted.
async function loadRows(db: Db, cipher: ConfigCipher) {
  const rows = await db.orm.public.Config.select(
    "key",
    "value",
    "updatedAt",
  ).all();
  // Rows for keys removed from the registry are ignored
  return rows
    .filter((r) => isConfigKey(r.key))
    .map((r) => ({
      ...r,
      value: unseal(cipher, r.key, r.value),
    }));
}

@QueryHandler(GetConfigQuery)
export class GetConfigHandler implements IQueryHandler<GetConfigQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    @Inject(CONFIG_CIPHER) private readonly cipher: ConfigCipher,
  ) {}

  // Secrets included: for the api's own use, never sent as is
  async execute(): Promise<ConfigValues> {
    const values: Record<string, unknown> = defaults();
    for (const row of await loadRows(this.db, this.cipher)) {
      values[row.key] = row.value;
    }
    return values as ConfigValues;
  }
}

@QueryHandler(GetPublicConfigsQuery)
export class GetPublicConfigsHandler
  implements IQueryHandler<GetPublicConfigsQuery>
{
  constructor(private readonly config: GetConfigHandler) {}

  async execute(): Promise<Record<string, unknown>> {
    const values = await this.config.execute();
    return Object.fromEntries(
      Object.entries(values).filter(
        ([k]) => CONFIG_KEYS[k as keyof typeof CONFIG_KEYS].public,
      ),
    );
  }
}

@QueryHandler(ListConfigsQuery)
export class ListConfigsHandler implements IQueryHandler<ListConfigsQuery> {
  constructor(
    @InjectDb() private readonly db: Db,
    @Inject(CONFIG_CIPHER) private readonly cipher: ConfigCipher,
  ) {}

  async execute(): Promise<ConfigView[]> {
    const rows = new Map<string, Awaited<ReturnType<typeof loadRows>>[number]>(
      (await loadRows(this.db, this.cipher)).map((r) => [
        r.key,
        r,
      ]),
    );
    return Object.entries(CONFIG_KEYS).map(([key, spec]) => {
      const row = rows.get(key);
      const { value, secretsSet } = maskSecrets(
        key as keyof typeof CONFIG_KEYS,
        row ? row.value : spec.default,
      );
      return {
        key,
        label: spec.label,
        value,
        secretsSet,
        default: spec.default,
        isSet: !!row,
        public: spec.public,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }
}
