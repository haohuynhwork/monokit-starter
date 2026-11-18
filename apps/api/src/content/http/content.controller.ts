import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ApiFailResponse,
  ApiZodBody,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { PreviewContentQuery } from "../application/queries/preview-content.query.js";
import {
  type PreviewContentDto,
  previewContentSchema,
  previewedContentSchema,
} from "./content.dto.js";

// Rich text shared by posts, pages and products. Anyone signed in (they
// can all write drafts).
@ApiTags("content")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@Controller("content")
export class ContentController {
  constructor(private readonly queries: QueryBus) {}

  // POST: bodies are too large for a query string; nothing is stored
  @Post("preview")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Clean a body the way saving would, without saving",
  })
  @ApiZodBody(previewContentSchema)
  @ApiZodResponse(previewedContentSchema)
  async preview(
    @Body(new ZodValidationPipe(previewContentSchema)) body: PreviewContentDto,
  ): Promise<{
    html: string;
  }> {
    return {
      html: await this.queries.execute(new PreviewContentQuery(body.html)),
    };
  }
}
