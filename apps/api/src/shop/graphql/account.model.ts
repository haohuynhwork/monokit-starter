import { Field, ID, InputType, ObjectType } from "@nestjs/graphql";
import { ShopCartLineInput, ShopOrderAddressModel } from "./catalog.model.js";

// GraphQL shapes of the signed-in customer's shop data (addresses, checkout).
// Cart, wishlist and order outputs reuse catalog.model.ts.
// Types are spelled out in @Field: the test runner emits no decorator metadata.

@ObjectType("ShopAddress", {
  description: "One of my shipping addresses",
})
export class ShopAddressModel extends ShopOrderAddressModel {
  @Field(() => ID)
  id!: string;

  @Field(() => Boolean)
  isDefault!: boolean;
}

// Validated by the http zod schemas; every field is optional here so the
// errors come back in the REST shape
@InputType("ShopAddressInput", {
  description: "Fields of an address; on update, only the ones to change",
})
export class ShopAddressInput {
  @Field(() => String, {
    nullable: true,
  })
  label?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  recipientName?: string;

  @Field(() => String, {
    nullable: true,
  })
  phone?: string;

  @Field(() => String, {
    nullable: true,
  })
  line1?: string;

  @Field(() => String, {
    nullable: true,
  })
  line2?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  city?: string;

  @Field(() => String, {
    nullable: true,
    description: "ISO 3166-2; the api fills region with its name",
  })
  regionCode?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  region?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  postalCode?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  countryCode?: string;

  @Field(() => Boolean, {
    nullable: true,
    description: "Make it the default (the first address always is)",
  })
  isDefault?: boolean;
}

@InputType("ShopBillingInput", {
  description: "addressId null: bill the shipping address, with these details",
})
export class ShopBillingInput {
  @Field(() => ID, {
    nullable: true,
  })
  addressId?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  company?: string | null;

  @Field(() => String, {
    nullable: true,
  })
  taxCode?: string | null;
}

@InputType("ShopPlaceOrderInput")
export class ShopPlaceOrderInput {
  @Field(() => [
    ShopCartLineInput,
  ])
  items!: ShopCartLineInput[];

  @Field(() => ID)
  addressId!: string;

  @Field(() => String)
  paymentMethod!: string;

  @Field(() => String, {
    nullable: true,
  })
  note?: string | null;

  @Field(() => ShopBillingInput, {
    nullable: true,
    description: "Omit to bill the shipping address",
  })
  billing?: ShopBillingInput;
}
