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
import { RequirePermission } from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import {
  ApiFailResponse,
  ApiZodBody,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { CreatePageLayoutCommand } from "../application/commands/create-page-layout.command.js";
import { DeletePageLayoutCommand } from "../application/commands/delete-page-layout.command.js";
import { SetDefaultPageLayoutCommand } from "../application/commands/set-default-page-layout.command.js";
import { UpdatePageLayoutCommand } from "../application/commands/update-page-layout.command.js";
import { ListPageLayoutsQuery } from "../application/queries/list-page-layouts.query.js";
import type { PageLayoutView } from "../application/queries/page.view.js";
import {
  type PageLayoutDto,
  pageLayoutSchema,
  pageLayoutViewSchema,
  type UpdatePageLayoutDto,
  updatePageLayoutSchema,
} from "./pages.dto.js";
import { getPageLayout } from "./pages.mapping.js";

// Shared page frames (ideas/pages "Layout"); editors and admins
@ApiTags("pages")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@ApiFailResponse(403, "Not an editor or admin")
@RequirePermission("page:manage")
@Controller("page-layouts")
export class PageLayoutsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Every layout with how many pages use it",
  })
  @ApiZodResponse(pageLayoutViewSchema.array())
  list(): Promise<PageLayoutView[]> {
    return this.queries.execute(new ListPageLayoutsQuery());
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a layout",
  })
  @ApiZodResponse(pageLayoutViewSchema)
  show(@Param("id", IdPipe) id: bigint): Promise<PageLayoutView> {
    return this.get(id);
  }

  @Post()
  @ApiOperation({
    summary: "Create a layout (the first one is the default)",
  })
  @ApiZodBody(pageLayoutSchema)
  @ApiZodResponse(pageLayoutViewSchema, {
    status: 201,
  })
  async create(
    @Body(new ZodValidationPipe(pageLayoutSchema)) body: PageLayoutDto,
  ): Promise<PageLayoutView> {
    const id = await this.commands.execute(
      new CreatePageLayoutCommand(body.name, body.settings),
    );
    return this.get(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Rename or change its settings",
  })
  @ApiZodBody(updatePageLayoutSchema)
  @ApiZodResponse(pageLayoutViewSchema)
  @ApiFailResponse(409, "Name taken")
  async update(
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(updatePageLayoutSchema))
    body: UpdatePageLayoutDto,
  ): Promise<PageLayoutView> {
    await this.commands.execute(new UpdatePageLayoutCommand(id, body));
    return this.get(id);
  }

  @Post(":id/default")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Make it the layout of pages that pick none",
  })
  @ApiZodResponse(pageLayoutViewSchema)
  async makeDefault(@Param("id", IdPipe) id: bigint): Promise<PageLayoutView> {
    await this.commands.execute(new SetDefaultPageLayoutCommand(id));
    return this.get(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete (not the default, not while in use)",
  })
  @ApiNoContentResponse()
  @ApiFailResponse(409, "Default layout or used by pages")
  async remove(@Param("id", IdPipe) id: bigint): Promise<void> {
    await this.commands.execute(new DeletePageLayoutCommand(id));
  }

  private get(id: bigint): Promise<PageLayoutView> {
    return getPageLayout(this.queries, id);
  }
}
