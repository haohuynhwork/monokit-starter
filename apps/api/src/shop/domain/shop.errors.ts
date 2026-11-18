import { DomainError } from "../../common/domain/domain-error.js";

export class InvalidShopInputError extends DomainError {
  readonly code = "invalid_shop_input";
  readonly kind = "invalid";
}

export class ShopForbiddenError extends DomainError {
  readonly code = "shop_forbidden";
  readonly kind = "forbidden";
  constructor() {
    super("Only editors and admins manage the shop");
  }
}

export class CategoryNotFoundError extends DomainError {
  readonly code = "category_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Category not found");
  }
}

export class CategorySlugTakenError extends DomainError {
  readonly code = "category_slug_taken";
  readonly kind = "conflict";
  constructor() {
    super("Another category already has this slug");
  }
}

export class CategoryCycleError extends DomainError {
  readonly code = "category_cycle";
  readonly kind = "invalid";
  constructor() {
    super("A category cannot be moved under itself or its children");
  }
}

export class CategoryInUseError extends DomainError {
  readonly code = "category_in_use";
  readonly kind = "conflict";
  constructor() {
    super("Move or delete its subcategories and products first");
  }
}

export class ProductNotFoundError extends DomainError {
  readonly code = "product_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Product not found");
  }
}

export class ProductSlugTakenError extends DomainError {
  readonly code = "product_slug_taken";
  readonly kind = "conflict";
  constructor() {
    super("Another product already has this slug");
  }
}

export class SkuTakenError extends DomainError {
  readonly code = "sku_taken";
  readonly kind = "conflict";
  constructor() {
    super("Another product already has this SKU");
  }
}

export class InvalidVariantImageError extends DomainError {
  readonly code = "invalid_variant_image";
  readonly kind = "invalid";
}

export class AddressNotFoundError extends DomainError {
  readonly code = "address_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Address not found");
  }
}

export class CountryNotShippedError extends DomainError {
  readonly code = "country_not_shipped";
  readonly kind = "invalid";
  constructor(countryCode: string) {
    super(`The shop doesn't ship to ${countryCode}`);
  }
}

export class RatingNotAllowedError extends DomainError {
  readonly code = "rating_not_allowed";
  readonly kind = "forbidden";
  constructor() {
    super("Only customers who received this product can rate it");
  }
}

export class RatingNotFoundError extends DomainError {
  readonly code = "rating_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Rating not found");
  }
}

export class OrderNotFoundError extends DomainError {
  readonly code = "order_not_found";
  readonly kind = "not_found";
  constructor() {
    super("Order not found");
  }
}

export class ProductUnavailableError extends DomainError {
  readonly code = "product_unavailable";
  readonly kind = "conflict";
}

export class OutOfStockError extends DomainError {
  readonly code = "out_of_stock";
  readonly kind = "conflict";
}

export class InvalidOrderTransitionError extends DomainError {
  readonly code = "invalid_order_transition";
  readonly kind = "conflict";
}

export class OrderChangedError extends DomainError {
  readonly code = "order_changed";
  readonly kind = "conflict";
  constructor() {
    super("The order was changed meanwhile; reload and try again");
  }
}
