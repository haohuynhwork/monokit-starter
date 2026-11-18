# Coupons

Tables exist; no api or UI yet (see Not built yet).

```sql
CREATE TABLE coupons (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- Stored upper-case; customers type it in any case
    code           VARCHAR(64) NOT NULL CHECK (code = upper(code)),
    description    VARCHAR(255) NOT NULL DEFAULT '',
    -- 'percent': value in basis points (1000 = 10%); 'fixed': minor units
    type           TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
    value          BIGINT NOT NULL,
    -- Cap for percent coupons; NULL: no cap
    max_discount   BIGINT,
    -- Subtotal needed before the discount
    min_subtotal   BIGINT NOT NULL DEFAULT 0,
    -- A NULL bound is open
    starts_at      TIMESTAMPTZ,
    ends_at        TIMESTAMPTZ,
    -- NULL: unlimited; used_count counts orders not cancelled/rejected
    usage_limit    INT,
    per_user_limit INT,
    used_count     INT NOT NULL DEFAULT 0,
    stackable      BOOLEAN NOT NULL DEFAULT false,
    active         BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ,
    CONSTRAINT coupons_value_range
        CHECK (value > 0 AND (type <> 'percent' OR value <= 10000)),
    CONSTRAINT coupons_usage_limit CHECK (used_count >= 0
        AND (usage_limit IS NULL OR used_count <= usage_limit)),
    CONSTRAINT coupons_window
        CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);
CREATE UNIQUE INDEX coupons_code_unique ON coupons (code) WHERE deleted_at IS NULL;

-- Coupons applied to an order, with what each took off
CREATE TABLE order_coupons (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id  BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    -- NULL once the coupon is hard-deleted; code keeps the copy
    coupon_id BIGINT REFERENCES coupons(id) ON DELETE SET NULL,
    code      VARCHAR(64) NOT NULL,
    discount  BIGINT NOT NULL CHECK (discount >= 0),
    UNIQUE (order_id, code)
);
CREATE INDEX order_coupons_coupon_idx ON order_coupons (coupon_id);
```

Planned rules:
- Codes typed at checkout (case-insensitive; stored upper-case). Several per
  order only when every one is `stackable`; a non-stackable coupon must be
  alone. At most `coupons.maxPerOrder` (config, default 3) codes.
- `percent` (value in bps, optional `maxDiscount`) or `fixed` (minor units).
  Applies to the subtotal only, never to shipping. Order: percent coupons
  first, then fixed, each on what's left (so the result doesn't depend on
  the order typed); ties by code. Each discount = min(computed, remaining),
  so the sum never exceeds the subtotal. Tax is on `subtotal - discount`.
  `minSubtotal` is checked against the subtotal before any discount.
- Valid when: active, not deleted, inside `startsAt..endsAt`, subtotal >=
  `minSubtotal`, `usedCount < usageLimit`, and the user's orders with it
  (not cancelled/rejected) < `perUserLimit`.
- Checkout writes one `OrderCoupon { code, discount }` per coupon, sets
  `Order.discount` to their sum, and bumps every `usedCount` in the same
  transaction (coupons locked in id order to avoid deadlocks;
  `UPDATE ... WHERE usedCount <
  usageLimit`, 0 rows -> 409 `coupon_exhausted`, so no overselling).
- Per-user limit counts the user's `OrderCoupon` rows whose order is not
  cancelled/rejected.
- Cancelling or rejecting an order gives every use back (`usedCount - 1` each).
  Editing or deleting a coupon never changes placed orders.
- Code is fixed once any order used it (otherwise editable); delete is soft.

## Not built yet

- Everything above except the tables: no domain, api (`/coupons`,
  `/me/coupons/check`, `couponCodes` at checkout), config
  `coupons.maxPerOrder`, or panel UI.
