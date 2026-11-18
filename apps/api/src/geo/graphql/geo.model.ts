import { Field, ID, InputType, Int, ObjectType } from "@nestjs/graphql";

// GraphQL shapes of the geo views (application/queries/*.view.ts) and of the
// http DTO bodies, which the same zod schemas validate.
// Types are spelled out in @Field: the test runner emits no decorator metadata.

@ObjectType("Region", {
  description: "An entry of the address pick list",
})
export class RegionModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  countryCode!: string;

  @Field(() => ID, {
    nullable: true,
  })
  parentId!: string | null;

  @Field(() => String)
  code!: string;

  @Field(() => String)
  name!: string;

  @Field(() => Int)
  position!: number;

  @Field(() => Boolean)
  active!: boolean;
}

@ObjectType("Currency")
export class CurrencyModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  code!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  symbol!: string;

  @Field(() => Int)
  decimals!: number;

  @Field(() => String, {
    description: "Decimal text: 1 base currency = rate of this one",
  })
  rate!: string;

  @Field(() => String, {
    description: "ISO 8601 timestamp",
  })
  rateAt!: string;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Int)
  position!: number;

  @Field(() => Boolean)
  isBase!: boolean;
}

@ObjectType("Currencies")
export class CurrenciesModel {
  @Field(() => String, {
    description: "config shop.currency; prices are stored in it",
  })
  base!: string;

  @Field(() => [
    CurrencyModel,
  ])
  items!: CurrencyModel[];
}

@ObjectType("Locale")
export class LocaleModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  code!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  nativeName!: string;

  @Field(() => Boolean)
  rtl!: boolean;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Boolean)
  isDefault!: boolean;

  @Field(() => Int)
  position!: number;
}

// --- Inputs (validated by the http zod schemas) ---

@InputType("CreateRegionInput")
export class CreateRegionInput {
  @Field(() => String, {
    description: "2-letter country code, e.g. VN",
  })
  countryCode!: string;

  @Field(() => String)
  code!: string;

  @Field(() => String)
  name!: string;

  @Field(() => ID, {
    nullable: true,
  })
  parentId?: string | null;

  @Field(() => Int, {
    nullable: true,
  })
  position?: number;
}

@InputType("UpdateRegionInput")
export class UpdateRegionInput {
  @Field(() => String, {
    nullable: true,
  })
  name?: string;

  @Field(() => Int, {
    nullable: true,
  })
  position?: number;

  @Field(() => Boolean, {
    nullable: true,
  })
  active?: boolean;

  @Field(() => ID, {
    nullable: true,
    description: "null moves it to the top level",
  })
  parentId?: string | null;
}

@InputType("CreateCurrencyInput")
export class CreateCurrencyInput {
  @Field(() => String)
  code!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, {
    nullable: true,
  })
  symbol?: string;

  @Field(() => Int, {
    nullable: true,
  })
  decimals?: number;

  @Field(() => String, {
    description: "Decimal text: 1 base currency = rate of this one",
  })
  rate!: string;

  @Field(() => Int, {
    nullable: true,
  })
  position?: number;
}

@InputType("UpdateCurrencyInput")
export class UpdateCurrencyInput {
  @Field(() => String, {
    nullable: true,
  })
  name?: string;

  @Field(() => String, {
    nullable: true,
  })
  symbol?: string;

  @Field(() => Int, {
    nullable: true,
  })
  decimals?: number;

  @Field(() => String, {
    nullable: true,
  })
  rate?: string;

  @Field(() => Int, {
    nullable: true,
  })
  position?: number;

  @Field(() => Boolean, {
    nullable: true,
  })
  active?: boolean;
}

@InputType("CreateLocaleInput")
export class CreateLocaleInput {
  @Field(() => String)
  code!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, {
    nullable: true,
  })
  nativeName?: string;

  @Field(() => Boolean, {
    nullable: true,
  })
  rtl?: boolean;

  @Field(() => Boolean, {
    nullable: true,
  })
  isDefault?: boolean;

  @Field(() => Int, {
    nullable: true,
  })
  position?: number;
}

@InputType("UpdateLocaleInput")
export class UpdateLocaleInput {
  @Field(() => String, {
    nullable: true,
  })
  name?: string;

  @Field(() => String, {
    nullable: true,
  })
  nativeName?: string;

  @Field(() => Boolean, {
    nullable: true,
  })
  rtl?: boolean;

  @Field(() => Boolean, {
    nullable: true,
  })
  isDefault?: boolean;

  @Field(() => Int, {
    nullable: true,
  })
  position?: number;

  @Field(() => Boolean, {
    nullable: true,
  })
  active?: boolean;
}
