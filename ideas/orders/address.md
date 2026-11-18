# Addresses

A user's saved shipping addresses, picked at checkout.

```sql
CREATE TABLE addresses (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- 'Home', 'Office'
    label          VARCHAR(100),
    recipient_name VARCHAR(255) NOT NULL,
    phone          VARCHAR(32) NOT NULL,
    line1          VARCHAR(255) NOT NULL,
    line2          VARCHAR(255),
    city           VARCHAR(255) NOT NULL,
    -- ISO 3166-2 subdivision, e.g. 'VN-HN'; NULL when typed freely
    region_code    VARCHAR(10),
    -- The region's name: copied from region_code, or typed
    region         VARCHAR(255),
    postal_code    VARCHAR(32),
    -- ISO 3166-1 alpha-2, e.g. 'VN'
    country_code   VARCHAR(2) NOT NULL,
    is_default     BOOLEAN NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
);
CREATE INDEX addresses_user_idx ON addresses (user_id);
-- At most one default per user
CREATE UNIQUE INDEX addresses_one_default ON addresses (user_id)
    WHERE is_default AND deleted_at IS NULL;
```

- Pickers: country (only those in `shipping.countries`, see `../configs`)
  and region from the `regions` table (geo context, `GET /public/regions`;
  seeded from `@packages/geo`); city, street and postal code are typed. The
  api checks the region is active and belongs to the country, and fills
  `region` with its name. Existing addresses keep codes later deactivated.
- The first address becomes the default; the list returns the default first.
  Unsetting or deleting the default leaves the user without one.
- Delete is soft (`deleted_at`).
- Checkout refuses an address whose country is no longer shipped to
  (`country_not_shipped`).
- Orders copy the address (`orders.shipping_address`), so editing or
  deleting one never changes past orders.
- Setting a default clears the previous one in the same transaction.
- Api (own addresses only): `GET`, `POST /me/addresses`,
  `PATCH`, `DELETE /me/addresses/:id`.
