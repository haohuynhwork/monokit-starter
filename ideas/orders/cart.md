# Cart and wishlist

Both are kept on the server, per signed-in user, so they follow the customer
across devices. Signed-out visitors get the same in cookies, which join the
account at login (see _Guests_).

```sql
CREATE TABLE cart_items (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    variant_id BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity   INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, variant_id)
);
CREATE INDEX cart_items_variant_idx ON cart_items (variant_id);

CREATE TABLE wishlist_items (
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, product_id)
);
CREATE INDEX wishlist_items_product_idx ON wishlist_items (product_id);
```

## Cart

- One line per variant; adding a variant already there adds to its quantity.
- Quantity 1 to 99 per line, at most 50 lines.
- Only variants of `active` products can be added or changed, and never
  above tracked stock.
- No prices are stored: the cart always shows what each variant costs now
  (sale window included). Lines whose product was taken off sale, deleted,
  or ran out stay in the cart, marked unavailable with the reason, and don't
  count toward the subtotal.
- Checkout is the normal `POST /me/orders` with the available lines. After
  the order commits (`OrderPlacedEvent`), the ordered variants leave the
  cart; the rest stays.
- Hard delete; no history.
- Api: `GET /me/cart`; `POST /me/cart/items` `{ variantId, quantity }`;
  `PATCH`, `DELETE /me/cart/items/:variantId`; `DELETE /me/cart`. Every
  change answers with the whole cart.

## Wishlist

- Products, not variants: the customer picks options when buying.
- Only `active` products can be saved; saving twice is fine. Products taken
  off sale later stay on the list (shown as no longer sold); deleted ones
  drop out.
- Api: `GET /me/wishlist` (products, newest first); `GET /me/wishlist/ids`
  (to mark hearts in listings); `PUT`, `DELETE /me/wishlist/:productId`.

## Guests

- The web keeps a guest's cart and wishlist in HttpOnly cookies:
  `my-cms_cart` = `[[variantId, quantity], ...]` (50 lines, 30 days) and
  `my-cms_wishlist` = `[productId, ...]` newest first (100 ids, 90 days).
  Ids only: prices, stock and names always come from the api.
- Shown through public endpoints: `POST /shop/cart` `{ items }` prices a cart
  like a saved one; `POST /shop/wishlist` `{ productIds }` lists the products
  (drafts left out, since anyone can ask).
- At login or registration: `POST /me/cart/merge` adds the lines (skipping
  what can't be ordered, capping at 99 and tracked stock, never failing) and
  `POST /me/wishlist/merge` adds the products on sale. The cookies are
  cleared once merged; a failed merge keeps them for the next login.
- Checkout always needs an account; guests are sent to log in and back.

## Not built yet

- Coupon codes at checkout (orders have `OrderCoupon`, but `POST /me/orders` takes no codes yet).
- "Price dropped" or "back in stock" notices for wishlist items.
