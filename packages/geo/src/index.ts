import data from "./subdivisions.json" with { type: "json" };

export type Subdivision = {
  code: string;
  name: string;
};

const SUBDIVISIONS = data as Record<
  string,
  [
    string,
    string,
  ][]
>;

// ISO 3166-1 alpha-2 codes, sorted
export const COUNTRIES: readonly string[] = Object.keys(SUBDIVISIONS);

const KNOWN = new Set(COUNTRIES);

export function isCountry(code: string): boolean {
  return KNOWN.has(code);
}

// Names come from the runtime (Intl), so any locale works without data
export function countryName(code: string, locale = "en"): string {
  try {
    return (
      new Intl.DisplayNames(
        [
          locale,
        ],
        {
          type: "region",
        },
      ).of(code) ?? code
    );
  } catch {
    return code;
  }
}

// ISO 3166-2 subdivisions of a country, by name; [] when it has none (or
// unknown)
export function subdivisions(countryCode: string): Subdivision[] {
  return (SUBDIVISIONS[countryCode] ?? []).map(([code, name]) => ({
    code,
    name,
  }));
}

export function findSubdivision(code: string): Subdivision | undefined {
  const country = code.split("-")[0] ?? "";
  return subdivisions(country).find((s) => s.code === code);
}

export function isSubdivisionOf(code: string, countryCode: string): boolean {
  return (
    code.startsWith(`${countryCode}-`) && findSubdivision(code) !== undefined
  );
}
export * from "./phone.js";
