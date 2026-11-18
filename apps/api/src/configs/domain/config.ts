import {
  InvalidConfigValueError,
  UnknownConfigKeyError,
} from "./config.errors.js";
import {
  type CheckResult,
  CONFIG_KEYS,
  type ConfigKey,
  type ConfigValue,
  isConfigKey,
  secretFields,
} from "./config-keys.js";

export function parseKey(key: string): ConfigKey {
  if (!isConfigKey(key)) {
    throw new UnknownConfigKeyError(key);
  }
  return key;
}

// A setting change: known key, valid value (normalized, e.g. trimmed).
// Secret fields left empty keep their `current` value, since the panel never
// sees secrets and can't send them back.
export function parseConfig(
  key: string,
  value: unknown,
  current: ConfigValue = null,
): {
  key: ConfigKey;
  value: ConfigValue;
} {
  const k = parseKey(key);
  const result = (
    CONFIG_KEYS[k].check as (v: unknown) => CheckResult<ConfigValue>
  )(value);
  if (!result.ok) {
    throw new InvalidConfigValueError(k, result.reason);
  }
  return {
    key: k,
    value: keepSecrets(k, result.value, current),
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function keepSecrets(
  key: ConfigKey,
  next: ConfigValue,
  current: ConfigValue,
): ConfigValue {
  // A secret only carries over within the same driver (e.g. an SMTP
  // password never becomes an api key)
  if (!isRecord(next) || !isRecord(current) || next.driver !== current.driver) {
    return next;
  }
  const merged: Record<string, unknown> = {
    ...(next as object),
  };
  for (const f of secretFields(key)) {
    if (merged[f] === "" && typeof current[f] === "string") {
      merged[f] = current[f];
    }
  }
  return merged as unknown as ConfigValue;
}

// For the panel: secret fields blanked, plus which of them hold a value
export function maskSecrets(
  key: ConfigKey,
  value: unknown,
): {
  value: unknown;
  secretsSet: string[];
} {
  const fields = secretFields(key);
  if (!isRecord(value) || fields.length === 0) {
    return {
      value,
      secretsSet: [],
    };
  }
  const masked: Record<string, unknown> = {
    ...value,
  };
  const secretsSet: string[] = [];
  for (const f of fields.filter((f) => f in masked)) {
    if (typeof masked[f] === "string" && masked[f] !== "") {
      secretsSet.push(f);
    }
    masked[f] = "";
  }
  return {
    value: masked,
    secretsSet,
  };
}
