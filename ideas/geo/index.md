# Geo

Reference data managed by staff: regions (the address pick list), the
site's locales, and the currencies prices can be shown in. Context
`apps/api/src/geo`; other contexts read it through `FindRegionQuery` /
`ListRegionsQuery` on the `QueryBus`. Countries themselves are not a table:
they come from `@packages/geo` (ISO 3166-1).

```sql
-- Address pick list. Seeded from @packages/geo (ISO 3166-2); children
-- (e.g. VN wards) hang off parent_id. Codes are kept forever once an address
-- uses them: retire a region with active = false.
CREATE TABLE regions (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- ISO 3166-1 alpha-2
    country_code VARCHAR(2) NOT NULL,
    parent_id    BIGINT REFERENCES regions(id) ON DELETE RESTRICT,
    -- ISO 3166-2 when one exists (e.g. 'VN-HN'), else a staff-chosen code
    code         VARCHAR(20) NOT NULL UNIQUE,
    name         VARCHAR(255) NOT NULL,
    -- Order among siblings, ascending; ties by name
    position     INT NOT NULL DEFAULT 0,
    -- Inactive: hidden from the picker, still valid on existing addresses
    active       BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON regions (country_code, parent_id);
CREATE INDEX ON regions (parent_id);

-- A language plus region conventions (dates, numbers). Exactly one default
-- (the fallback); inactive ones are hidden from switchers.
CREATE TABLE locales (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- BCP 47: 'vi-VN', 'en-US', 'en'
    code        VARCHAR(16) NOT NULL UNIQUE,
    -- In English ('Vietnamese (Vietnam)'), and in itself ('Tiếng Việt')
    name        VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    -- Right-to-left script (Arabic, Hebrew)
    rtl         BOOLEAN NOT NULL DEFAULT false,
    active      BOOLEAN NOT NULL DEFAULT true,
    is_default  BOOLEAN NOT NULL DEFAULT false,
    position    INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT locales_default_active CHECK (NOT is_default OR active)
);
CREATE UNIQUE INDEX locales_one_default ON locales (is_default) WHERE is_default;

-- Prices are stored in the base currency (config shop.currency); rate
-- converts: 1 base = rate of this one. The base row's rate is always 1.
CREATE TABLE currencies (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- ISO 4217, upper-case
    code       VARCHAR(3) NOT NULL UNIQUE
               CONSTRAINT currencies_code_upper CHECK (code = upper(code)),
    name       VARCHAR(100) NOT NULL,
    symbol     VARCHAR(10) NOT NULL DEFAULT '',
    -- Minor-unit digits: 2 for USD, 0 for VND
    decimals   INT NOT NULL DEFAULT 2
               CONSTRAINT currencies_decimals_range CHECK (decimals BETWEEN 0 AND 4),
    rate       NUMERIC(20, 10) NOT NULL DEFAULT 1
               CONSTRAINT currencies_rate_positive CHECK (rate > 0),
    -- When the rate was last set
    rate_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    active     BOOLEAN NOT NULL DEFAULT true,
    position   INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- **Regions**: code is upper-cased, looks like `VN-HN` / `VN-HN-01`, must
  start with `<country>-`, and is fixed once created (addresses store it).
  The parent must be in the same country; moving under itself or a
  descendant is `409 region_cycle`. Delete is hard and only when nothing
  uses it: an address (`regionCode`) or a child region, else `409
  region_in_use` (deactivate instead). Duplicate code: `409
  region_code_taken`.
- **Locales**: code is normalised to canonical BCP 47 case (`vi_vn` ->
  `vi-VN`, `zh-hant` -> `zh-Hant`); `nativeName` defaults to `name`. The
  first locale created becomes the default whatever is asked. The default
  can't be unset (make another one default; the repository clears the old
  one in the same transaction), deactivated or deleted. Only an active
  locale can become the default.
- **Currencies**: the base (config `shop.currency`, default `USD`) has rate 1,
  stays active and can't be deleted (`BaseCurrencyLockedError`). Rate is
  decimal text; `rateAt` moves only when the rate changes. Code is fixed.
  Rates are set by hand.
- **Other contexts**: shop addresses store `regionCode` (checked with
  `FindRegionQuery`: a region of the address's country, and `region` is
  copied from its name) and `countryCode` (checked with `isCountry` from
  `@packages/geo` and against config `shipping.countries`, NULL = ship
  anywhere; `400 country_not_shipped`). `set-config` checks
  `shipping.countries` entries against `@packages/geo`. Orders copy
  `shop.currency` as their currency; money is minor units of it.
- **Seeding** (`make seed`, through the `CommandBus` as the system admin):
  `regions.seed.ts` runs `SeedRegionsCommand` per country in
  `@packages/geo`, top level only, positions in list order, skipping any
  country that already has rows so staff edits survive. `locales.seed.ts`
  fills empty tables only: the base currency (name and decimals from `Intl`)
  and `en-US` (default) + `vi-VN`. `@packages/geo`'s snapshot is stale for
  VN (63 provinces, not the 34 after the 2025 merger): fix in the panel.
- **Routes**: staff (`@Roles('admin', 'editor')`, else 403; the handlers
  also refuse non-staff actors with `geo_forbidden`):
  `GET|POST /regions` (`?country=&parentId=`, inactive too), `PATCH|DELETE
  /regions/:id`; the same CRUD on `/locales` and `/currencies` (DELETE 204).
  Public, no sign-in, active only: `GET /public/regions?country=VN&parentId=`
  (`root` for the top level, every level when omitted; by position then
  name), `GET /public/locales` (default first), `GET /public/currencies`
  (`{ base, items }`, each with `isBase`).
- **Panels**: `/panel/regions`, `/panel/locales`, `/panel/currencies` (staff
  only), list with inline create/edit, toggle active and delete via server
  actions.

## Not built yet

- The web address picker still reads subdivisions from `@packages/geo`;
  it should read `GET /public/regions` (`.work/sync-code-ideas.md`).
- Phone helpers in `@packages/geo` for users' phones (`ideas/users`):
  `callingCode(country)` ('VN' -> '84') and `parsePhone(country, input)`
  (valid national number and E.164, or null), wrapping
  `libphonenumber-js/min`.
