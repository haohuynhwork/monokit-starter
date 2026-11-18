import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { JSONScalar } from "../../common/graphql/json.scalar.js";

// Inputs of the staff catalog mutations; validated by the http/shop.dto.ts
// zod schemas, so every field is optional here and zod decides.

@InputType("ShopCategoryInput")
export class ShopCategoryInput {
  @Field(() => String, {
    nullable: true,
  })
  name?: string;

  @Field(() => String, {
    nullable: true,
  })
  slug?: string;

  @Field(() => ID, {
    nullable: true,
  })
  parentId?: string | null;

  @Field(() => Int, {
    nullable: true,
  })
  position?: number;
}

@InputType("ShopProductOptionInput")
export class ShopProductOptionInput {
  @Field(() => String)
  name!: string;

  @Field(() => [
    String,
  ])
  values!: string[];
}

@InputType("ShopProductVariantInput")
export class ShopProductVariantInput {
  @Field(() => ID, {
    nullable: true,
    description: "Omit to add a variant; variants left out are deleted",
  })
  id?: string;

  @Field(() => String, {
    nullable: true,
  })
  sku?: string | null;

  @Field(() => String, {
    description: "Minor units",
  })
  listPrice!: string;

  @Field(() => String, {
    nullable: true,
    description: "Minor units; null: no sale",
  })
  salePrice?: string | null;

  @Field(() => Boolean, {
    nullable: true,
  })
  trackStock?: boolean;

  @Field(() => Int, {
    nullable: true,
  })
  stock?: number;

  @Field(() => JSONScalar, {
    nullable: true,
    description: "Option name -> value, one per option",
  })
  values?: Record<string, string>;
}

@InputType("ShopProductInput", {
  description: "Create needs name, slug and variants",
})
export class ShopProductInput {
  @Field(() => ID, {
    nullable: true,
  })
  categoryId?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  name?: string;

  @Field(() => String, {
    nullable: true,
  })
  slug?: string;

  @Field(() => String, {
    nullable: true,
  })
  description?: string;

  @Field(() => String, {
    nullable: true,
    description: "HTML; sanitized by the api",
  })
  content?: string;

  @Field(() => String, {
    nullable: true,
  })
  saleStartsAt?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  saleEndsAt?: string | null;

  @Field(() => String, {
    nullable: true,
    description: "draft, active or archived",
  })
  status?: string;

  @Field(
    () => [
      ShopProductOptionInput,
    ],
    {
      nullable: true,
    },
  )
  options?: ShopProductOptionInput[];

  @Field(
    () => [
      ShopProductVariantInput,
    ],
    {
      nullable: true,
    },
  )
  variants?: ShopProductVariantInput[];
}

@InputType("ShopGalleryItemInput")
export class ShopGalleryItemInput {
  @Field(() => ID)
  assetId!: string;

  @Field(() => String, {
    nullable: true,
  })
  title?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  description?: string | null;
}

@InputType("ShopOptionValueImageInput")
export class ShopOptionValueImageInput {
  @Field(() => String)
  option!: string;

  @Field(() => String)
  value!: string;

  @Field(() => ID, {
    nullable: true,
  })
  image!: string | null;
}

@InputType("ShopProductImagesInput")
export class ShopProductImagesInput {
  @Field(() => ID, {
    nullable: true,
  })
  cover?: string | null;

  @Field(
    () => [
      ShopGalleryItemInput,
    ],
    {
      nullable: true,
      description: "The whole gallery in order",
    },
  )
  gallery?: ShopGalleryItemInput[];

  @Field(() => JSONScalar, {
    nullable: true,
    description: "Variant id -> asset id (null removes)",
  })
  variants?: Record<string, string | null>;

  @Field(
    () => [
      ShopOptionValueImageInput,
    ],
    {
      nullable: true,
    },
  )
  optionValues?: ShopOptionValueImageInput[];
}
