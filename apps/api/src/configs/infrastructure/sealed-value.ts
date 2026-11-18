import type { ConfigCipher } from "../domain/config-cipher.js";
import { type ConfigKey, secretFields } from "../domain/config-keys.js";

// How an encrypted value sits in the Jsonb column
export interface SealedValue {
  $sealed: string;
}

export const isSealed = (v: unknown): v is SealedValue =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as SealedValue).$sealed === "string";

export const needsSealing = (key: ConfigKey, value: unknown) =>
  value !== null && secretFields(key).length > 0;

// Row value to plain value; values stored before a key had secrets are plain
export function unseal(
  cipher: ConfigCipher,
  key: string,
  stored: unknown,
): unknown {
  return isSealed(stored) ? cipher.open(key, stored.$sealed) : stored;
}
