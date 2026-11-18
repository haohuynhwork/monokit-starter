import { Field, ObjectType } from "@nestjs/graphql";
import { JSONScalar } from "../../common/graphql/json.scalar.js";

// GraphQL shape of ConfigView (application/queries/list-configs.query.ts).
// Types are spelled out in @Field: the test runner emits no decorator metadata.

@ObjectType("Config", {
  description: "A setting with its default",
})
export class ConfigModel {
  @Field(() => String)
  key!: string;

  @Field(() => String)
  label!: string;

  @Field(() => JSONScalar, {
    nullable: true,
    description:
      "Secret fields are blank; `secretsSet` names those holding a value",
  })
  value!: unknown;

  @Field(() => [
    String,
  ])
  secretsSet!: string[];

  @Field(() => JSONScalar, {
    nullable: true,
  })
  default!: unknown;

  @Field(() => Boolean, {
    description: "false: no row, value is the default",
  })
  isSet!: boolean;

  @Field(() => Boolean)
  public!: boolean;

  @Field(() => String, {
    nullable: true,
    description: "ISO 8601 timestamp",
  })
  updatedAt!: string | null;
}
