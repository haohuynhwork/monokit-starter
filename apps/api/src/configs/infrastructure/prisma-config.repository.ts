import { Inject, Injectable } from "@nestjs/common";
import { type Db, InjectDb } from "@packages/nest";
import { ConfigSecretMissingError } from "../domain/config.errors.js";
import type { ConfigRepository } from "../domain/config.repository.js";
import { CONFIG_CIPHER, type ConfigCipher } from "../domain/config-cipher.js";
import {
  type ConfigKey,
  type ConfigValue,
  isConfigKey,
} from "../domain/config-keys.js";
import { isSealed, needsSealing, unseal } from "./sealed-value.js";

@Injectable()
export class PrismaConfigRepository implements ConfigRepository {
  constructor(
    @InjectDb() private readonly db: Db,
    @Inject(CONFIG_CIPHER) private readonly cipher: ConfigCipher,
  ) {}

  async get(key: ConfigKey): Promise<ConfigValue> {
    const row = await this.db.orm.public.Config.select("value")
      .where({
        key,
      })
      .first();
    return row ? (unseal(this.cipher, key, row.value) as ConfigValue) : null;
  }

  async set(
    key: ConfigKey,
    value: ConfigValue,
    updatedById: bigint,
  ): Promise<void> {
    const stored = this.toStored(key, value);
    await this.db.orm.public.Config.select("key").upsert({
      conflictOn: {
        key,
      },
      create: {
        key,
        value: stored,
        updatedById,
      },
      update: {
        value: stored,
        updatedById,
      },
    });
  }

  async reset(key: ConfigKey): Promise<void> {
    await this.db.orm.public.Config.where({
      key,
    }).deleteAndCount();
  }

  async reencrypt(): Promise<number> {
    if (!this.cipher.available) {
      return 0;
    }
    const rows = await this.db.orm.public.Config.select("key", "value").all();
    let changed = 0;
    for (const row of rows) {
      if (!isConfigKey(row.key) || !needsSealing(row.key, row.value)) {
        continue;
      }
      if (isSealed(row.value) && !this.cipher.isStale(row.value.$sealed)) {
        continue;
      }
      const plain = unseal(this.cipher, row.key, row.value);
      // Runs once on start, before requests; the same value, newly sealed
      await this.db.orm.public.Config.where({
        key: row.key,
      }).update({
        value: this.toStored(row.key, plain as ConfigValue),
      });
      changed++;
    }
    return changed;
  }

  // Settings are plain JSON; the cast is only for records' lack of an
  // index signature
  private toStored(key: ConfigKey, value: ConfigValue): never {
    if (!needsSealing(key, value)) {
      return value as never;
    }
    if (!this.cipher.available) {
      throw new ConfigSecretMissingError(key);
    }
    return {
      $sealed: this.cipher.seal(key, value),
    } as never;
  }
}
