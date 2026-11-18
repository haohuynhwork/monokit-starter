# @packages/geo

Countries (ISO 3166-1) and their subdivisions (ISO 3166-2) for address
pickers, shared by the api and web. `src/subdivisions.json` is a snapshot of
`country-region-data`, regenerated with `pnpm --filter @packages/geo generate`
then `pnpm --filter @packages/geo build`; it can lag behind reforms (e.g. it
still lists Vietnam's 63 provinces from before the 2025 merger into 34).
