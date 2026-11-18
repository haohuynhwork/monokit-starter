import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { RequirePermission } from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import {
  ApiFailResponse,
  ApiZodBody,
  ApiZodPaginatedResponse,
  ApiZodQuery,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { Paginated } from "../../common/http/responses/paginated.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { ChangeContactMessageStatusCommand } from "../application/commands/change-contact-message-status.command.js";
import { CreateContactMessageCommand } from "../application/commands/create-contact-message.command.js";
import { DeleteContactMessageCommand } from "../application/commands/delete-contact-message.command.js";
import { OpenContactMessageCommand } from "../application/commands/open-contact-message.command.js";
import type {
  ContactMessageDetail,
  ContactMessageView,
} from "../application/queries/contact-message.view.js";
import { CountContactMessagesQuery } from "../application/queries/count-contact-messages.query.js";
import { GetContactMessageQuery } from "../application/queries/get-contact-message.query.js";
import { ListContactMessagesQuery } from "../application/queries/list-contact-messages.query.js";
import { ContactMessageNotFoundError } from "../domain/contact.errors.js";
import type { ContactMessageStatus } from "../domain/contact-message.js";
import {
  type ContactMessageStatusDto,
  type CreateContactMessageDto,
  contactMessageCountsSchema,
  contactMessageDetailSchema,
  contactMessageStatusSchema,
  contactMessageViewSchema,
  createContactMessageSchema,
  type ListContactMessagesDto,
  listContactMessagesSchema,
} from "./contact.dto.js";

// The panel inbox for contact-form messages (ideas/contact); staff only
@ApiTags("contact")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@ApiFailResponse(403, "Admins and editors only")
@RequirePermission("contact:manage")
@Controller("contact/messages")
export class ContactMessagesController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Messages, newest first",
  })
  @ApiZodQuery(listContactMessagesSchema)
  @ApiZodPaginatedResponse(contactMessageViewSchema)
  async list(
    @Query(new ZodValidationPipe(listContactMessagesSchema))
    query: ListContactMessagesDto,
  ): Promise<Paginated<ContactMessageView>> {
    const { status, limit, offset } = query;
    const { items, total } = await this.queries.execute(
      new ListContactMessagesQuery(status ?? null, limit, offset),
    );
    return new Paginated(items, {
      total,
      limit,
      offset,
    });
  }

  @Post()
  @ApiOperation({
    summary: "Add a message by hand (rich text); nothing is mailed",
  })
  @ApiZodBody(createContactMessageSchema)
  @ApiZodResponse(contactMessageDetailSchema, {
    status: 201,
  })
  @ApiFailResponse(400, "No email or phone, or a field too long")
  async create(
    @Body(new ZodValidationPipe(createContactMessageSchema))
    body: CreateContactMessageDto,
  ): Promise<ContactMessageDetail> {
    const { status, ...fields } = body;
    const id = await this.commands.execute(
      new CreateContactMessageCommand(fields, status),
    );
    return this.show(id);
  }

  // Before ':id' so 'counts' isn't taken for an id
  @Get("counts")
  @ApiOperation({
    summary: "How many messages per status",
  })
  @ApiZodResponse(contactMessageCountsSchema)
  counts(): Promise<Record<ContactMessageStatus, number>> {
    return this.queries.execute(new CountContactMessagesQuery());
  }

  @Get(":id")
  @ApiOperation({
    summary: "One message",
  })
  @ApiZodResponse(contactMessageDetailSchema)
  @ApiFailResponse(404, "No such message")
  async show(@Param("id", IdPipe) id: bigint): Promise<ContactMessageDetail> {
    const message = await this.queries.execute(new GetContactMessageQuery(id));
    if (!message) {
      throw new ContactMessageNotFoundError();
    }
    return message;
  }

  @Post(":id/open")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Opened in the panel: new becomes read",
  })
  @ApiNoContentResponse()
  @ApiFailResponse(404, "No such message")
  async open(@Param("id", IdPipe) id: bigint): Promise<void> {
    await this.commands.execute(new OpenContactMessageCommand(id));
  }

  @Patch(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Set the status (read, replied, spam, ...)",
  })
  @ApiZodBody(contactMessageStatusSchema)
  @ApiNoContentResponse()
  @ApiFailResponse(404, "No such message")
  async changeStatus(
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(contactMessageStatusSchema))
    body: ContactMessageStatusDto,
  ): Promise<void> {
    await this.commands.execute(
      new ChangeContactMessageStatusCommand(id, body.status),
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a message",
  })
  @ApiNoContentResponse()
  @ApiFailResponse(404, "No such message")
  async remove(@Param("id", IdPipe) id: bigint): Promise<void> {
    await this.commands.execute(new DeleteContactMessageCommand(id));
  }
}
