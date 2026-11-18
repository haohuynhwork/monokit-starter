import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ApiNoContentResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { Public } from "../../common/http/guards/auth.decorators.js";
import {
  ApiFailResponse,
  ApiZodBody,
  ApiZodQuery,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { RateLimit } from "../../common/http/guards/rate-limit.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { GetMenuQuery } from "../application/queries/get-menu.query.js";
import { GetPublicPageQuery } from "../application/queries/get-public-page.query.js";
import type {
  MenuItem,
  PublicPageView,
} from "../application/queries/page.view.js";
import { PageNotFoundError } from "../domain/page.errors.js";
import {
  type ContactDto,
  contactSchema,
  menuItemSchema,
  type PublicPageDto,
  publicPageSchema,
  publicPageViewSchema,
} from "./pages.dto.js";
import { contactCommand } from "./pages.mapping.js";

// What the website reads: live pages only, no sign-in
@ApiTags("public")
@Public()
@Controller("public")
export class PublicPagesController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get("pages/by-path")
  @ApiOperation({
    summary: "A live page by its path, layout resolved",
  })
  @ApiZodQuery(publicPageSchema)
  @ApiZodResponse(publicPageViewSchema)
  @ApiFailResponse(404, "No live page at this path")
  async byPath(
    @Query(new ZodValidationPipe(publicPageSchema)) query: PublicPageDto,
  ): Promise<PublicPageView> {
    const page = await this.queries.execute(new GetPublicPageQuery(query.path));
    if (!page) {
      throw new PageNotFoundError();
    }
    return page;
  }

  @Get("pages/menu")
  @ApiOperation({
    summary: "The site header menu",
  })
  @ApiZodResponse(menuItemSchema.array())
  menu(): Promise<MenuItem[]> {
    return this.queries.execute(new GetMenuQuery());
  }

  @Post("contact")
  @RateLimit({
    limit: 5,
    ttl: 10 * 60_000,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Send a message through a page's contact form",
  })
  @ApiZodBody(contactSchema)
  @ApiNoContentResponse()
  @ApiFailResponse(400, "Invalid fields")
  @ApiFailResponse(404, "No such form on a live page")
  @ApiFailResponse(429, "Too many messages")
  async contact(
    @Body(new ZodValidationPipe(contactSchema)) body: ContactDto,
    @Req() req: Request,
  ): Promise<void> {
    const command = contactCommand(
      body,
      req.ip ?? null,
      req.get("user-agent") ?? null,
    );
    if (command) {
      await this.commands.execute(command);
    }
  }
}
