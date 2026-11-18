// Regenerates src/subdivisions.json from country-region-data (a dev
// dependency; runtime code never imports it). Run: pnpm --filter @packages/geo generate
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const data = JSON.parse(
  readFileSync(require.resolve("country-region-data/data.json"), "utf8"),
);

// { "VN": [["VN-HN", "Hà Nội"], ...], "AQ": [] }. A country where some
// regions have no ISO code gets none, so the picker never offers half a list.
const out = {};
for (const country of data) {
  const regions = country.regions;
  out[country.countryShortCode] = regions.every((r) => r.shortCode)
    ? regions
        .map((r) => [
          `${country.countryShortCode}-${r.shortCode}`,
          r.name,
        ])
        .sort((a, b) => a[1].localeCompare(b[1]))
    : [];
}
const sorted = Object.fromEntries(
  Object.entries(out).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(
  new URL("../src/subdivisions.json", import.meta.url),
  `${JSON.stringify(sorted)}\n`,
);
console.log(`${Object.keys(sorted).length} countries`);
