import { Inject } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  Args,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from "@nestjs/graphql";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { DeleteNotificationCommand } from "../application/commands/delete-notification.command.js";
import { DeleteReadNotificationsCommand } from "../application/commands/delete-read-notifications.command.js";
import { MarkAllNotificationsReadCommand } from "../application/commands/mark-all-notifications-read.command.js";
import { MarkNotificationReadCommand } from "../application/commands/mark-notification-read.command.js";
import { MarkNotificationUnreadCommand } from "../application/commands/mark-notification-unread.command.js";
import { SendTestNotificationCommand } from "../application/commands/send-test-notification.command.js";
import {
  ListNotificationsQuery,
  type NotificationPage,
} from "../application/queries/list-notifications.query.js";
import type { NotificationView } from "../application/queries/notification.view.js";
import {
  REALTIME_STREAM,
  type RealtimeEvent,
  type RealtimeStream,
} from "../domain/notification.repository.js";
import { listNotificationsSchema } from "../http/notifications.dto.js";
import {
  NotificationEventModel,
  NotificationPageModel,
  SentTestNotificationModel,
} from "./notification.model.js";

const listArgs = new ZodValidationPipe(listNotificationsSchema);
const idArg = {
  type: () => ID,
} as const;

// Same as NotificationsController: the signed-in user's own notifications.
// Live changes: the notificationEvents subscription (GraphQL over WebSocket),
// or the /realtime socket.io channel.
@Resolver(() => NotificationPageModel)
export class NotificationsResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
    @Inject(REALTIME_STREAM) private readonly stream: RealtimeStream,
  ) {}

  @Subscription(() => NotificationEventModel, {
    description:
      "Changes to my notifications while subscribed (WebSocket at /graphql)",
    resolve: toEvent,
  })
  notificationEvents(
    @CurrentUser() user: AuthUser,
  ): AsyncIterableIterator<RealtimeEvent> {
    return this.stream.forUser(user.id);
  }

  @Query(() => NotificationPageModel, {
    description: "My notifications, newest first, with unread count",
  })
  notifications(
    @CurrentUser() user: AuthUser,
    @Args("limit", {
      type: () => Int,
      defaultValue: 20,
    })
    limit: number,
    @Args("before", {
      type: () => ID,
      nullable: true,
      description: "Cursor: only older than this notification id",
    })
    before?: string,
  ): Promise<NotificationPage> {
    const query = listArgs.transform({
      limit,
      before: before ?? undefined,
    });
    return this.queries.execute(
      new ListNotificationsQuery(
        user.id,
        query.limit,
        query.before ? BigInt(query.before) : null,
      ),
    );
  }

  @RequirePermission("settings:manage")
  @Mutation(() => SentTestNotificationModel, {
    description: "Send myself a test notification (stored and pushed live)",
  })
  async sendTestNotification(
    @CurrentUser() user: AuthUser,
  ): Promise<SentTestNotificationModel> {
    const id = await this.commands.execute(
      new SendTestNotificationCommand(user.id),
    );
    return {
      id: String(id),
    };
  }

  @Mutation(() => Boolean, {
    description: "Mark all mine as read",
  })
  async markAllNotificationsRead(
    @CurrentUser() user: AuthUser,
  ): Promise<boolean> {
    await this.commands.execute(new MarkAllNotificationsReadCommand(user.id));
    return true;
  }

  @Mutation(() => Boolean, {
    description: "Delete all mine that are read",
  })
  async deleteReadNotifications(
    @CurrentUser() user: AuthUser,
  ): Promise<boolean> {
    await this.commands.execute(new DeleteReadNotificationsCommand(user.id));
    return true;
  }

  @Mutation(() => Boolean, {
    description: "Delete one of mine",
  })
  async deleteNotification(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new DeleteNotificationCommand(id, user.id));
    return true;
  }

  @Mutation(() => Boolean, {
    description: "Mark one of mine as unread again",
  })
  async markNotificationUnread(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new MarkNotificationUnreadCommand(id, user.id));
    return true;
  }

  @Mutation(() => Boolean, {
    description: "Mark one of mine as read",
  })
  async markNotificationRead(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new MarkNotificationReadCommand(id, user.id));
    return true;
  }
}

function toEvent({ event, payload }: RealtimeEvent): NotificationEventModel {
  const isNew = event === "notification";
  const { id, wasUnread } = (payload ?? {}) as {
    id?: unknown;
    wasUnread?: unknown;
  };
  return {
    type: event,
    notification: isNew ? (payload as NotificationView) : null,
    id: !isNew && typeof id === "string" ? id : null,
    wasUnread: typeof wasUnread === "boolean" ? wasUnread : null,
  };
}
