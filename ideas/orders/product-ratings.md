# Product ratings

1 to 5 stars plus an optional review, one per user and product.

```sql
CREATE TABLE product_ratings (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stars      INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
    body       VARCHAR(2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (product_id, user_id)
);
CREATE INDEX product_ratings_user_idx ON product_ratings (user_id);
```

- Only users with a `delivered` order containing the product may rate
  (403 `rating_not_allowed`; 404 `rating_not_found`).
- Rating again replaces the old one (upsert). The product's `rating_count` /
  `rating_sum` change in the same transaction; average = sum / count.
- Hard delete (no history needed). Admins can delete any rating.
- Api: `GET /shop/products/:id/ratings` (public, newest `updated_at` first);
  `PUT`, `DELETE /products/:id/ratings/me`; `DELETE /ratings/:id` (admin).

## Not built yet

- Panel moderation of ratings (listing and deleting from the panel).
