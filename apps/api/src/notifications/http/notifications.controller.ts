import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import {
  ApiFailResponse,
  ApiZodQuery,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
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
import {
  type ListNotificationsDto,
  listNotificationsSchema,
  notificationPageSchema,
} from "./notifications.dto.js";

// The signed-in user's own notifications; new ones also arrive live on the
// /realtime socket as 'notification'
@ApiTags("notifications")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "My notifications, newest first, with unread count",
  })
  @ApiZodQuery(listNotificationsSchema)
  @ApiZodResponse(notificationPageSchema)
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listNotificationsSchema))
    query: ListNotificationsDto,
  ): Promise<NotificationPage> {
    return this.queries.execute(
      new ListNotificationsQuery(
        user.id,
        query.limit,
        query.before ? BigInt(query.before) : null,
      ),
    );
  }

  @Post("test")
  @RequirePermission("settings:manage")
  @ApiOperation({
    summary: "Send myself a test notification (stored and pushed live)",
  })
  @ApiFailResponse(403, "Not an admin")
  async test(@CurrentUser() user: AuthUser): Promise<{
    id: string;
  }> {
    const id = await this.commands.execute(
      new SendTestNotificationCommand(user.id),
    );
    return {
      id: String(id),
    };
  }

  @Post("read-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Mark all mine as read",
  })
  @ApiNoContentResponse()
  async readAll(@CurrentUser() user: AuthUser): Promise<void> {
    await this.commands.execute(new MarkAllNotificationsReadCommand(user.id));
  }

  // Before ':id' so 'read' isn't taken for an id
  @Delete("read")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete all mine that are read",
  })
  @ApiNoContentResponse()
  async clearRead(@CurrentUser() user: AuthUser): Promise<void> {
    await this.commands.execute(new DeleteReadNotificationsCommand(user.id));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete one of mine",
  })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(new DeleteNotificationCommand(id, user.id));
  }

  @Post(":id/unread")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Mark one of mine as unread again",
  })
  @ApiNoContentResponse()
  async unread(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(new MarkNotificationUnreadCommand(id, user.id));
  }

  @Post(":id/read")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Mark one of mine as read",
  })
  @ApiNoContentResponse()
  async read(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(new MarkNotificationReadCommand(id, user.id));
  }
}
