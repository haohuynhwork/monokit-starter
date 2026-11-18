import { Field, Float, ID, InputType, Int, ObjectType } from "@nestjs/graphql";
import { JSONScalar } from "../../common/graphql/json.scalar.js";
import { PaginatedType } from "../../common/graphql/paginated.js";

// GraphQL shapes of the shop views (application/queries/shop.view.ts),
// shared by every shop resolver. Ids are ID, money (minor units) String.
// Types are spelled out in @Field: the test runner emits no decorator metadata.

@ObjectType("ShopAsset", {
  description: "A stored file used by the shop",
})
export class ShopAssetModel {
  @Field(() => ID)
  assetId!: string;

  @Field(() => String, {
    nullable: true,
    description: "Ready-to-use URL",
  })
  url!: string | null;
}

@ObjectType("ShopGalleryItem")
export class ShopGalleryItemModel extends ShopAssetModel {
  @Field(() => String, {
    nullable: true,
  })
  title!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  description!: string | null;
}

@ObjectType("ShopCategory", {
  description: "A category; build the tree from parentId",
})
export class ShopCategoryModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, {
    nullable: true,
  })
  parentId!: string | null;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => Int)
  position!: number;
}

@ObjectType("ShopProductVariant")
export class ShopProductVariantModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String, {
    nullable: true,
  })
  sku!: string | null;

  @Field(() => JSONScalar, {
    description: "Option name -> value; {} without options",
  })
  values!: Record<string, string>;

  @Field(() => String, {
    description: '"M / Red"; empty without options',
  })
  name!: string;

  @Field(() => String, {
    description: "Regular price, minor units of shop.currency",
  })
  listPrice!: string;

  @Field(() => String, {
    nullable: true,
    description: "Sale price while the product's window is open now",
  })
  salePrice!: string | null;

  @Field(() => String, {
    description: "What it costs now: salePrice ?? listPrice",
  })
  price!: string;

  @Field(() => String, {
    nullable: true,
    description: "The sale price as set; staff queries only",
  })
  sale?: string | null;

  @Field(() => Boolean)
  trackStock!: boolean;

  @Field(() => Int, {
    nullable: true,
    description: "Public shop: null unless trackStock",
  })
  stock!: number | null;

  @Field(() => Boolean)
  inStock!: boolean;

  @Field(() => ShopAssetModel, {
    nullable: true,
    description: "The variant's own image; staff pick it",
  })
  image!: ShopAssetModel | null;

  @Field(() => String, {
    nullable: true,
    description:
      "What to show: its own image, else an option value image, else the cover",
  })
  imageUrl!: string | null;
}

@ObjectType("ShopProductOption")
export class ShopProductOptionModel {
  @Field(() => String)
  name!: string;

  @Field(() => [
    String,
  ])
  values!: string[];

  @Field(() => JSONScalar, {
    description:
      "Value -> its image ({ assetId, url }); values without one are left out",
  })
  images!: Record<string, ShopAssetModel>;
}

@ObjectType("ShopSaleWindow")
export class ShopSaleWindowModel {
  @Field(() => String, {
    nullable: true,
  })
  startsAt!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  endsAt!: string | null;
}

@ObjectType("ShopProductRatingSummary")
export class ShopProductRatingSummaryModel {
  @Field(() => Int)
  count!: number;

  @Field(() => Float, {
    nullable: true,
  })
  average!: number | null;
}

@ObjectType("ShopProduct")
export class ShopProductModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, {
    nullable: true,
  })
  categoryId!: string | null;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String, {
    nullable: true,
    description: "Sanitized HTML; detail queries only",
  })
  content?: string;

  @Field(() => String, {
    description: "Lowest variant price now",
  })
  priceMin!: string;

  @Field(() => String, {
    description: "Highest variant price now",
  })
  priceMax!: string;

  @Field(() => ShopSaleWindowModel, {
    nullable: true,
    description: "The sale window as set; staff queries only",
  })
  sale?: ShopSaleWindowModel;

  @Field(() => Boolean, {
    description: "Some variant is in stock",
  })
  inStock!: boolean;

  @Field(() => [
    ShopProductOptionModel,
  ])
  options!: ShopProductOptionModel[];

  @Field(() => [
    ShopProductVariantModel,
  ])
  variants!: ShopProductVariantModel[];

  @Field(() => String, {
    description: "draft, active or archived",
  })
  status!: string;

  @Field(() => ShopProductRatingSummaryModel)
  rating!: ShopProductRatingSummaryModel;

  @Field(() => ShopAssetModel, {
    nullable: true,
  })
  cover!: ShopAssetModel | null;

  @Field(() => [
    ShopGalleryItemModel,
  ])
  gallery!: ShopGalleryItemModel[];

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;
}

export const ShopProductPage = PaginatedType(
  ShopProductModel,
  "ShopProductPage",
);

@ObjectType("ShopRating")
export class ShopRatingModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => Int)
  stars!: number;

  @Field(() => String, {
    nullable: true,
  })
  body!: string | null;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;
}

export const ShopRatingPage = PaginatedType(ShopRatingModel, "ShopRatingPage");

// --- Cart ---

@ObjectType("ShopCartProduct")
export class ShopCartProductModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;
}

@ObjectType("ShopCartLine")
export class ShopCartLineModel {
  @Field(() => ID)
  variantId!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => ShopCartProductModel, {
    nullable: true,
    description: "null once the product is deleted",
  })
  product!: ShopCartProductModel | null;

  @Field(() => ShopProductVariantModel, {
    nullable: true,
  })
  variant!: ShopProductVariantModel | null;

  @Field(() => Boolean, {
    description: "Can be ordered as is: on sale and enough in stock",
  })
  available!: boolean;

  @Field(() => String, {
    nullable: true,
    description: "Why not, for the customer",
  })
  problem!: string | null;

  @Field(() => String, {
    description: "price * quantity, minor units; '0' when unavailable",
  })
  lineTotal!: string;
}

@ObjectType("ShopCart")
export class ShopCartModel {
  @Field(() => [
    ShopCartLineModel,
  ])
  items!: ShopCartLineModel[];

  @Field(() => Int, {
    description: "Units across all lines",
  })
  count!: number;

  @Field(() => String, {
    description: "Available lines, before shipping, tax and coupons",
  })
  subtotal!: string;
}

@InputType("ShopCartLineInput")
export class ShopCartLineInput {
  @Field(() => ID)
  variantId!: string;

  @Field(() => Int)
  quantity!: number;
}

// --- Orders ---

@ObjectType("ShopOrderAddress", {
  description: "An address as copied onto an order",
})
export class ShopOrderAddressModel {
  @Field(() => String, {
    nullable: true,
  })
  label!: string | null;

  @Field(() => String)
  recipientName!: string;

  @Field(() => String)
  phone!: string;

  @Field(() => String)
  line1!: string;

  @Field(() => String, {
    nullable: true,
  })
  line2!: string | null;

  @Field(() => String)
  city!: string;

  @Field(() => String, {
    nullable: true,
  })
  regionCode!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  region!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  postalCode!: string | null;

  @Field(() => String)
  countryCode!: string;
}

@ObjectType("ShopBillingAddress")
export class ShopBillingAddressModel extends ShopOrderAddressModel {
  @Field(() => String, {
    nullable: true,
  })
  company!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  taxCode!: string | null;
}

@ObjectType("ShopOrderSummary")
export class ShopOrderSummaryModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, {
    nullable: true,
  })
  userId!: string | null;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  paymentMethod!: string;

  @Field(() => String)
  paymentStatus!: string;

  @Field(() => String)
  currency!: string;

  @Field(() => String)
  total!: string;

  @Field(() => Int)
  itemCount!: number;

  @Field(() => String)
  recipientName!: string;

  @Field(() => String)
  createdAt!: string;
}

export const ShopOrderSummaryPage = PaginatedType(
  ShopOrderSummaryModel,
  "ShopOrderSummaryPage",
);

@ObjectType("ShopOrderItem")
export class ShopOrderItemModel {
  @Field(() => ID, {
    nullable: true,
  })
  productId!: string | null;

  @Field(() => ID, {
    nullable: true,
  })
  variantId!: string | null;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  variantName!: string;

  @Field(() => String, {
    nullable: true,
  })
  sku!: string | null;

  @Field(() => String)
  listPrice!: string;

  @Field(() => String)
  unitPrice!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => String)
  lineTotal!: string;
}

@ObjectType("ShopOrderEvent")
export class ShopOrderEventModel {
  @Field(() => String)
  type!: string;

  @Field(() => JSONScalar)
  data!: Record<string, unknown>;

  @Field(() => ID, {
    nullable: true,
  })
  actorId!: string | null;

  @Field(() => String)
  createdAt!: string;
}

@ObjectType("ShopOrder", {
  description: "An order with items and timeline",
})
export class ShopOrderModel {
  @Field(() => ID)
  id!: string;

  @Field(() => ID, {
    nullable: true,
  })
  userId!: string | null;

  @Field(() => String)
  status!: string;

  @Field(() => String)
  paymentMethod!: string;

  @Field(() => String)
  paymentStatus!: string;

  @Field(() => String)
  currency!: string;

  @Field(() => String)
  total!: string;

  @Field(() => String)
  subtotal!: string;

  @Field(() => String)
  shippingFee!: string;

  @Field(() => String)
  tax!: string;

  @Field(() => ShopOrderAddressModel)
  shippingAddress!: ShopOrderAddressModel;

  @Field(() => ShopBillingAddressModel, {
    nullable: true,
    description: "Null: bill the shipping address (no company details)",
  })
  billingAddress!: ShopBillingAddressModel | null;

  @Field(() => String, {
    nullable: true,
  })
  trackingNumber!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  paidAt!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  note!: string | null;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;

  @Field(() => [
    ShopOrderItemModel,
  ])
  items!: ShopOrderItemModel[];

  @Field(() => [
    ShopOrderEventModel,
  ])
  events!: ShopOrderEventModel[];
}
