# Orders

What a user bought. An order copies everything it needs (names, prices,
address, fees) when placed, so later changes to products, configs or
addresses never change it.

```sql
CREATE TABLE orders (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id          BIGINT REFERENCES users(id) ON DELETE SET NULL,
    status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'processing', 'shipped',
                                       'delivered', 'cancelled', 'rejected')),
    -- ISO 4217, copied from shop.currency
    currency         VARCHAR(3) NOT NULL,
    -- Minor units
    subtotal         BIGINT NOT NULL,
    -- Sum of order_coupons.discount (see coupons.md); 0 without coupons
    discount         BIGINT NOT NULL DEFAULT 0,
    shipping_fee     BIGINT NOT NULL,
    tax              BIGINT NOT NULL,
    total            BIGINT NOT NULL,
    -- Copy of the address (see address.md)
    shipping_address JSONB NOT NULL,
    -- Who pays, for the invoice (see Billing); NULL: the shipping address,
    -- no company details
    billing_address  JSONB,
    tracking_number  VARCHAR(100),
    payment_method   TEXT NOT NULL CHECK (payment_method IN ('cod', 'bank_transfer')),
    payment_status   TEXT NOT NULL DEFAULT 'unpaid'
                     CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    paid_at          TIMESTAMPTZ,
    note             VARCHAR(1000),
    -- Why staff rejected or cancelled it; shown to the customer
    status_reason    VARCHAR(500),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT orders_total_sum
        CHECK (total = subtotal - discount + shipping_fee + tax),
    CONSTRAINT orders_discount_range CHECK (discount BETWEEN 0 AND subtotal)
);
CREATE INDEX orders_user_idx ON orders (user_id, created_at);
CREATE INDEX orders_status_idx ON orders (status, created_at);

CREATE TABLE order_items (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id     BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    -- NULL once the product / variant is hard-deleted; the copies remain
    product_id   BIGINT REFERENCES products(id) ON DELETE SET NULL,
    variant_id   BIGINT REFERENCES product_variants(id) ON DELETE SET NULL,
    name         VARCHAR(255) NOT NULL,
    -- Option values at checkout, e.g. 'M / Red'; '' without options
    variant_name VARCHAR(255) NOT NULL DEFAULT '',
    sku          VARCHAR(64),
    -- Regular price at checkout, and what was charged per unit (the sale
    -- price if one was on)
    list_price   BIGINT NOT NULL,
    unit_price   BIGINT NOT NULL,
    quantity     INT NOT NULL CHECK (quantity > 0)
);
CREATE INDEX order_items_order_idx ON order_items (order_id);
CREATE INDEX order_items_product_idx ON order_items (product_id);
CREATE INDEX order_items_variant_idx ON order_items (variant_id);

-- Every status / payment change, for the timeline in the panel
CREATE TABLE order_events (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id   BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    -- 'placed', 'status_changed', 'payment_changed'; data is { from, to }
    -- for changes, {} for placed
    type       VARCHAR(32) NOT NULL,
    data       JSONB NOT NULL,
    actor_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_events_order_idx ON order_events (order_id, created_at);
CREATE INDEX order_events_actor_idx ON order_events (actor_id);
```

## Status

```
pending -> processing -> shipped -> delivered
   \            \
    +------------+--> cancelled   (before shipping only)
```

- The customer may cancel while `pending`; staff while not yet `shipped`.
  Cancelling puts tracked stock back.
- `shipped` may set `tracking_number`.
- Staff changes check the status it was loaded with (409 `order_changed`);
  other moves are 409 `invalid_order_transition`.
- Payment is separate from status. No gateway yet: `cod` (cash on delivery)
  or `bank_transfer`; staff move it `unpaid -> paid` (sets `paid_at`), then
  `paid -> refunded` or back to `unpaid` (clears `paid_at`).

## Shipping and payment

- Shipping fee: `shipping.flatFee`, or 0 when the subtotal reaches
  `shipping.freeOver`. Tax: `subtotal * shop.taxRateBps / 10000`, rounded
  half up. Both read from configs at checkout and stored on the order.
- A card gateway later adds `payments` rows (provider, intent id, amount,
  status) per order; `payment_status` stays the summary.

## Billing

The invoice can go to someone other than the recipient, with company
details for a VAT invoice.
- `POST /me/orders` takes an optional `billing: { addressId, company,
  taxCode }`. `addressId` is any own saved address, or null for the
  shipping address. Saved addresses only allow countries the shop ships
  to, so billing does too for now (checkout doesn't recheck the billing
  country).
- The order stores a copy, like `shipping_address`, plus `company` and
  `tax_code`. Stored only when it adds something: billing that is the
  shipping address with no company details stays NULL.
- `taxCode`: up to 32 letters, digits, spaces, dots, dashes or slashes,
  starting with a letter or digit (Vietnam's
  MST is 10 or 13 digits); `company` up to 255 characters. No check
  against a tax registry.
- Checkout: "Same as the shipping address" (ticked by default); unticked,
  pick a saved address or fill in a new one (saved to the account), like
  shipping. Company and tax code are optional fields either way.
- Order pages (customer and staff) show billing next to shipping.

## Checkout (`POST /me/orders`)

`{ items: [{ variantId, quantity }], addressId, paymentMethod, note?,
billing? }` (1-100 lines, same variant merged, at most 1000 each). The
address must be the user's own (404 `address_not_found`) and its country
still shipped to (400 `country_not_shipped`); then, in one transaction:
1. Lock the live variants (`FOR UPDATE`, id order); each product must be
   live and `active` (409 `product_unavailable`). Tracked stock goes down,
   refused below zero (409 `out_of_stock`).
2. Price everything from the database, never from the request: each item's
   `unit_price` is the variant's price at that moment (sale or list); the
   item copies the product name, `variant_name` and `sku`.
3. Insert the order, its items and a `placed` event; raise `OrderPlaced`
   (notifies staff; clears the ordered variants from the cart).

## Api

- Customer: `POST /me/orders`, `GET /me/orders`, `GET /me/orders/:id`,
  `POST /me/orders/:id/cancel`.
- Staff (editor, admin): `GET /orders?status=&q=`, `GET /orders/:id`,
  `POST /orders/:id/status` `{ status, trackingNumber? }`,
  `POST /orders/:id/payment` `{ paymentStatus }`.

## Not built yet

- `rejected`: staff refuse a `pending` order with a reason
  (`status_reason`), restocking like `cancelled`. The column and enum value
  exist; the domain allows no move to it and there is no
  `POST /orders/:id/reject`. Views don't return `status_reason` yet.
- Coupons at checkout (`discount` stays 0; see coupons.md).
