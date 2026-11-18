# Configs

Site-wide settings an admin changes in the panel without a deploy: site
name, shop currency, shipping fees. One row per key.

```sql
CREATE TABLE configs (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Dotted name, e.g. 'shop.currency'
    key           VARCHAR(100) NOT NULL UNIQUE,
    -- Any JSON; its shape per key is checked in the domain
    value         JSONB NOT NULL,
    updated_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    -- Set on every write
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON configs (updated_by_id);
```

## Keys

Known keys and their defaults are code (`configs/domain/config-keys.ts`). A
missing row means the default; unknown keys are refused.

| key                      | type                                            | default  |    public     |
| ------------------------ | ----------------------------------------------- | -------- | :-----------: |
| `site.name`              | string, 1..100                                  | `My CMS` |      yes      |
| `site.description`       | string, ..500                                   | `''`     |      yes      |
| `shop.currency`          | ISO 4217 code (upper-cased)                     | `USD`    |      yes      |
| `shop.taxRateBps`        | int, 0..10000                                   | `0`      |      yes      |
| `shipping.flatFee`       | int, minor units, 0..10^12                      | `0`      |      yes      |
| `shipping.freeOver`      | int, 0..10^12, or null                          | `null`   |      yes      |
| `shipping.countries`     | ISO 3166-1 codes, 1+ unique, or null (anywhere) | `null`   |      yes      |
| `orders.autoCancelHours` | int, 1..8760, or null                           | `null`   |      no       |
| `mail`                   | mail record or null (email off)                 | `null`   | no, encrypted |

`shipping.countries`: the domain checks format and duplicates;
`SetConfigHandler` checks each code is a real country (`isCountry` from
`@packages/geo`).

`mail` is one record, since its fields only make sense together. `driver`
picks how mail leaves, and each driver has its own fields (all have
`fromName`, `fromEmail`):

| driver   | fields                                           | notes                                      |
| -------- | ------------------------------------------------ | ------------------------------------------ |
| `smtp`   | `host`, `port`, `secure`, `username`, `password` | works with almost any provider             |
| `resend` | `apiKey`                                         | HTTPS, for hosts that block SMTP ports     |
| `log`    | none                                             | writes emails to the api log (development) |

`fromEmail` is required, `fromName` optional; smtp needs `host`, and a
`password` needs a `username`. A new provider is a sender in
`mail/infrastructure` plus its case here (see `ideas/mail`).

## Api

- `GET /configs` (admin): every key with its value, default and whether set.
- `PUT /configs/:key` `{ value }` (admin); `DELETE /configs/:key` back to the
  default.
- `GET /configs/public`: public keys only, for the site and checkout.

## Errors

| code                    | kind            | when                                         |
| ----------------------- | --------------- | -------------------------------------------- |
| `unknown_config_key`    | not found (404) | key isn't in the registry                    |
| `invalid_config_value`  | invalid (400)   | value fails the key's check                  |
| `config_secret_missing` | conflict (409)  | a secret value is saved without `APP_SECRET` |

## Panel

`/panel/settings` lists every key with its label, default and a Reset
button. `shipping.countries` is a searchable checklist (`COUNTRIES` from
`@packages/geo`); `mail` has per-driver fields and a "Send test" box
(`POST /mail/test`).

## Notes

- Other contexts read configs through `GetConfigQuery`, never the table.
- Money is integer minor units (cents); `shop.currency` names the unit.
  Changing the currency doesn't convert existing prices or orders (orders
  keep their own `currency`).
- Secrets: a key lists its secret fields (`secret` in the registry, e.g.
  `mail.password`, `mail.apiKey`). Such a value is stored sealed with AES-256-GCM,
  `{ "$sealed": "v1.<kid>.<iv>.<tag>.<data>" }`, with the key name bound in
  (a value can't be copied to another key). The AES key and `kid` are derived
  with HKDF-SHA256 from `APP_SECRET` in env (labels `config-aes-256-gcm`,
  `config-kid`), never the database. Without `APP_SECRET` the api runs, but
  secret settings can't be saved.
- Secret fields never leave the api: `GET /configs` blanks them and lists the
  ones holding a value in `secretsSet`. Saving a secret field empty keeps the
  stored one, unless the driver changed.
- Rotation: move `APP_SECRET` to `APP_SECRET_PREVIOUS`, set a new one,
  restart. `ConfigsModule.onApplicationBootstrap` runs
  `ReencryptConfigsCommand`, which re-seals values whose `kid` isn't the
  current key and logs the count, so `APP_SECRET_PREVIOUS` can go after.
  Losing both secrets means re-entering those settings.
