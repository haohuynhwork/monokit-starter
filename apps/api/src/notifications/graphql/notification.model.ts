import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { JSONScalar } from "../../common/graphql/json.scalar.js";

// GraphQL shapes of NotificationView / NotificationPage.
// Types are spelled out in @Field: the test runner emits no decorator metadata.

@ObjectType("NotificationActor", {
  description: "Who caused it",
})
export class NotificationActorModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;
}

@ObjectType("Notification")
export class NotificationModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String, {
    description: "post.published, order.placed or test",
  })
  type!: string;

  @Field(() => JSONScalar, {
    description: "Payload; its shape depends on `type`",
  })
  data!: unknown;

  @Field(() => NotificationActorModel, {
    nullable: true,
  })
  actor!: NotificationActorModel | null;

  @Field(() => String, {
    description: "ISO 8601 timestamp",
  })
  createdAt!: string;

  @Field(() => Boolean)
  read!: boolean;
}

@ObjectType("NotificationPage")
export class NotificationPageModel {
  @Field(() => [
    NotificationModel,
  ])
  items!: NotificationModel[];

  @Field(() => Int, {
    description: "All my unread notifications",
  })
  unread!: number;

  @Field(() => ID, {
    nullable: true,
    description: "Pass as `before` for the next page; null at the end",
  })
  nextCursor!: string | null;
}

@ObjectType("SentTestNotification")
export class SentTestNotificationModel {
  @Field(() => ID)
  id!: string;
}

@ObjectType("NotificationEvent", {
  description:
    "A change to my notifications, as pushed on the /realtime socket.io channel",
})
export class NotificationEventModel {
  @Field(() => String, {
    description:
      "notification (new), notification:read, notification:unread, notification:deleted, notification:read-all or notification:cleared-read",
  })
  type!: string;

  @Field(() => NotificationModel, {
    nullable: true,
    description: "The new notification (type notification)",
  })
  notification!: NotificationModel | null;

  @Field(() => ID, {
    nullable: true,
    description: "The one read, unread or deleted",
  })
  id!: string | null;

  @Field(() => Boolean, {
    nullable: true,
    description: "Whether the deleted one was unread (notification:deleted)",
  })
  wasUnread!: boolean | null;
}
