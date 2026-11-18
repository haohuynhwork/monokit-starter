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
  ApiZodBody,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { CreatePageCommand } from "../application/commands/create-page.command.js";
import { DeletePageCommand } from "../application/commands/delete-page.command.js";
import { MovePageCommand } from "../application/commands/move-page.command.js";
import { PublishPageCommand } from "../application/commands/publish-page.command.js";
import { UnpublishPageCommand } from "../application/commands/unpublish-page.command.js";
import { ListPagesQuery } from "../application/queries/list-pages.query.js";
import type {
  PageSummary,
  PageView,
} from "../application/queries/page.view.js";
import {
  type CreatePageDto,
  createPageSchema,
  type MovePageDto,
  movePageSchema,
  type PublishPageDto,
  pageSummarySchema,
  pageViewSchema,
  publishPageSchema,
  type UpdatePageDto,
  updatePageSchema,
} from "./pages.dto.js";
import { getPage, toId, updatePageCommand } from "./pages.mapping.js";

// The panel's pages: site structure, so editors and admins only
@ApiTags("pages")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@ApiFailResponse(403, "Not an editor or admin")
@RequirePermission("page:manage")
@Controller("pages")
export class PagesController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Every page (tree rows, no settings)",
  })
  @ApiZodResponse(pageSummarySchema.array())
  list(): Promise<PageSummary[]> {
    return this.queries.execute(new ListPagesQuery());
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a page with its settings",
  })
  @ApiZodResponse(pageViewSchema)
  show(@Param("id", IdPipe) id: bigint): Promise<PageView> {
    return this.get(id);
  }

  @Post()
  @ApiOperation({
    summary: "Create a draft",
  })
  @ApiZodBody(createPageSchema)
  @ApiZodResponse(pageViewSchema, {
    status: 201,
  })
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createPageSchema)) body: CreatePageDto,
  ): Promise<PageView> {
    const id = await this.commands.execute(
      new CreatePageCommand(
        body.title,
        toId(body.parentId),
        toId(body.layoutId),
        user.id,
      ),
    );
    return this.get(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Edit title, description, slug, settings, layout, menu",
  })
  @ApiZodBody(updatePageSchema)
  @ApiZodResponse(pageViewSchema)
  @ApiFailResponse(409, "Path taken by another page or post")
  async update(
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(updatePageSchema)) body: UpdatePageDto,
  ): Promise<PageView> {
    await this.commands.execute(updatePageCommand(id, body));
    return this.get(id);
  }

  @Post(":id/move")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Move under another page (null: the root)",
  })
  @ApiZodBody(movePageSchema)
  @ApiZodResponse(pageViewSchema)
  async move(
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(movePageSchema)) body: MovePageDto,
  ): Promise<PageView> {
    await this.commands.execute(new MovePageCommand(id, toId(body.parentId)));
    return this.get(id);
  }

  @Post(":id/publish")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Publish now, or schedule with a future `at`",
  })
  @ApiZodBody(publishPageSchema)
  @ApiZodResponse(pageViewSchema)
  async publish(
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(publishPageSchema)) body: PublishPageDto,
  ): Promise<PageView> {
    await this.commands.execute(
      new PublishPageCommand(id, body.at ? new Date(body.at) : undefined),
    );
    return this.get(id);
  }

  @Post(":id/unpublish")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Back to draft",
  })
  @ApiZodResponse(pageViewSchema)
  async unpublish(@Param("id", IdPipe) id: bigint): Promise<PageView> {
    await this.commands.execute(new UnpublishPageCommand(id));
    return this.get(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete (refused while it has child pages)",
  })
  @ApiNoContentResponse()
  async remove(@Param("id", IdPipe) id: bigint): Promise<void> {
    await this.commands.execute(new DeletePageCommand(id));
  }

  private get(id: bigint): Promise<PageView> {
    return getPage(this.queries, id);
  }
}
