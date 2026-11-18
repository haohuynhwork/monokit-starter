// Small value checkers for JSON settings (configs, pages): each returns the
// cleaned value or why it's refused

// The parsed value, or why it's refused
export type CheckResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      reason: string;
    };
export type Check<T> = (value: unknown) => CheckResult<T>;

export const ok = <T>(value: T): CheckResult<T> => ({
  ok: true,
  value,
});
export const no = (reason: string): CheckResult<never> => ({
  ok: false,
  reason,
});

export const text =
  (max: number): Check<string> =>
  (v) =>
    typeof v !== "string"
      ? no("must be text")
      : v.trim().length > max
        ? no(`at most ${max} characters`)
        : ok(v.trim());

export const int =
  (min: number, max: number): Check<number> =>
  (v) =>
    typeof v !== "number" || !Number.isInteger(v)
      ? no("must be a whole number")
      : v < min || v > max
        ? no(`must be between ${min} and ${max}`)
        : ok(v);

export const nullable =
  <T>(check: Check<T>): Check<T | null> =>
  (v) =>
    v === null ? ok(null) : check(v);

export const bool: Check<boolean> = (v) =>
  typeof v === "boolean" ? ok(v) : no("must be true or false");

export const oneOf =
  <const T extends string>(values: readonly T[]): Check<T> =>
  (v) =>
    typeof v === "string" && (values as readonly string[]).includes(v)
      ? ok(v as T)
      : no(`must be one of: ${values.join(", ")}`);

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
