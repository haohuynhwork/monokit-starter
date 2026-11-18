import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
  ApiZodBody,
  ApiZodQuery,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { DeletePostTagCommand } from "../application/commands/delete-post-tag.command.js";
import { RenamePostTagCommand } from "../application/commands/rename-post-tag.command.js";
import {
  ListPostTagsQuery,
  type PostTagView,
} from "../application/queries/list-post-tags.query.js";
import {
  type ListTagsDto,
  listTagsSchema,
  postTagViewSchema,
  type RenameTagDto,
  renameTagSchema,
} from "./posts.dto.js";

// The panel's post tags. Tags are created by tagging a post (PATCH
// /posts/:id); renaming and deleting need editor/admin (domain).
// Registered before PostsController so /posts/tags isn't read as /posts/:id.
@ApiTags("posts")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@RequirePermission("post:edit:own", "post:edit:any")
@Controller("posts/tags")
export class PostTagsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "All tags by name (q: autocomplete)",
  })
  @ApiZodQuery(listTagsSchema)
  @ApiZodResponse(postTagViewSchema.array())
  list(
    @Query(new ZodValidationPipe(listTagsSchema)) query: ListTagsDto,
  ): Promise<PostTagView[]> {
    return this.queries.execute(
      new ListPostTagsQuery({
        live: false,
        q: query.q,
      }),
    );
  }

  @Patch(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Rename (moves its /tags/<slug> page)",
  })
  @ApiZodBody(renameTagSchema)
  @ApiNoContentResponse()
  @ApiFailResponse(409, "Another tag has this name")
  async rename(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(renameTagSchema)) body: RenameTagDto,
  ): Promise<void> {
    await this.commands.execute(
      new RenamePostTagCommand(id, body.name, {
        id: user.id,
        permissions: user.permissions,
      }),
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete; posts lose the tag",
  })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(
      new DeletePostTagCommand(id, {
        id: user.id,
        permissions: user.permissions,
      }),
    );
  }
}
