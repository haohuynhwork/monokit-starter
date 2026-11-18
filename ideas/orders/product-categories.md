# Product categories

A tree of product categories ("Clothes > Shirts"). Small and rarely moved,
so a plain `parent_id` is enough (no closure table, unlike posts).

```sql
CREATE TABLE product_categories (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id  BIGINT REFERENCES product_categories(id) ON DELETE RESTRICT,
    name       VARCHAR(255) NOT NULL,
    -- URL name, unique among live categories, e.g. 'shirts'
    slug       VARCHAR(255) NOT NULL,
    -- Order among siblings, ascending
    position   INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX product_categories_slug_unique ON product_categories (slug) WHERE deleted_at IS NULL;
CREATE INDEX product_categories_parent_idx ON product_categories (parent_id);
```

- A category can't be its own ancestor (checked in the domain by walking
  up; 400 `category_cycle`).
- Slug taken among live categories: 409 `category_slug_taken`.
- Deleting (soft) is refused while it has live children or products (409
  `category_in_use`). Unknown id: 404 `category_not_found`.
- Api: `GET /shop/categories` (public) and `GET /categories` (editor,
  admin): flat, by position then name, the client builds the tree;
  `POST /categories`, `PATCH`, `DELETE /categories/:id` (editor, admin).
