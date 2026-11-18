import type { ConfigKey, ConfigValue } from "./config-keys.js";

export interface ConfigRepository {
  // The stored value, decrypted; null when unset
  get(key: ConfigKey): Promise<ConfigValue>;
  set(key: ConfigKey, value: ConfigValue, updatedById: bigint): Promise<void>;
  // Back to the default; no-op when unset
  reset(key: ConfigKey): Promise<void>;
  // Seals values stored with an older secret (or before the key had
  // secrets) with the current one; returns how many changed
  reencrypt(): Promise<number>;
}

export const CONFIG_REPOSITORY = Symbol("CONFIG_REPOSITORY");
