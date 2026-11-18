import { Field, ID, InputType, Int, ObjectType } from "@nestjs/graphql";
import { PaginatedType } from "../../common/graphql/paginated.js";

// GraphQL shapes of the contact views (application/queries/contact-message.view.ts)
// and of the REST bodies (http/contact.dto.ts, which still validates them).
// Types are spelled out in @Field: the test runner emits no decorator metadata.

const STATUS = "new, read, replied, spam or archived";

@ObjectType("ContactMessage", {
  description: "A contact-form message in the panel inbox",
})
export class ContactMessageModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String, {
    nullable: true,
  })
  name!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  email!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  phone!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  subject!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  message!: string | null;

  @Field(() => String, {
    description: "html: sanitized HTML (added in the panel); text: as typed",
  })
  messageFormat!: string;

  @Field(() => String, {
    description: STATUS,
  })
  status!: string;

  @Field(() => String, {
    nullable: true,
  })
  mailedAt!: string | null;

  @Field(() => String)
  createdAt!: string;
}

@ObjectType("ContactMessageDetail", {
  description: "One message with where it came from",
})
export class ContactMessageDetailModel extends ContactMessageModel {
  @Field(() => String, {
    nullable: true,
  })
  ip!: string | null;

  @Field(() => String, {
    nullable: true,
  })
  userAgent!: string | null;
}

export const ContactMessagePage = PaginatedType(
  ContactMessageModel,
  "ContactMessagePage",
);

@ObjectType("ContactMessageCounts", {
  description: "How many messages per status",
})
export class ContactMessageCountsModel {
  @Field(() => Int, {
    name: "new",
  })
  new!: number;

  @Field(() => Int)
  read!: number;

  @Field(() => Int)
  replied!: number;

  @Field(() => Int)
  spam!: number;

  @Field(() => Int)
  archived!: number;
}

@InputType("CreateContactMessageInput", {
  description: "A message staff add by hand; `message` is HTML",
})
export class CreateContactMessageInput {
  @Field(() => String, {
    nullable: true,
  })
  name?: string;

  @Field(() => String, {
    nullable: true,
  })
  email?: string;

  @Field(() => String, {
    nullable: true,
  })
  phone?: string;

  @Field(() => String, {
    nullable: true,
  })
  subject?: string;

  @Field(() => String, {
    nullable: true,
  })
  message?: string;

  @Field(() => String, {
    nullable: true,
    description: `${STATUS} (default read)`,
  })
  status?: string;
}
