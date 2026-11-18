import { Field, InputType, ObjectType } from "@nestjs/graphql";

// Types are spelled out in @Field: the test runner emits no decorator metadata.

@InputType("SendTestEmailInput")
export class SendTestEmailInput {
  @Field(() => String, {
    nullable: true,
    description: "Empty: the signed-in admin's address",
  })
  to?: string;

  @Field(() => Boolean, {
    nullable: true,
    description:
      "Default true: delivered now, so a wrong setting fails here; false goes through the queue like real mail",
  })
  sync?: boolean;
}

@ObjectType("SentTestEmail")
export class SentTestEmailModel {
  @Field(() => String)
  to!: string;

  @Field(() => Boolean, {
    description:
      "It went into the queue; false when delivered already (sync, or no Valkey)",
  })
  queued!: boolean;
}
