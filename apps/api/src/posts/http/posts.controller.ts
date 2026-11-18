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
  Put,
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
  metaOf,
  type Actor as RequestActor,
} from "../../common/domain/actor.js";
import {
  type AuthUser,
  CurrentActor,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
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
import { CreatePostCommand } from "../application/commands/create-post.command.js";
import { DeletePostCommand } from "../application/commands/delete-post.command.js";
import { DeletePostTranslationCommand } from "../application/commands/delete-post-translation.command.js";
import { EnsurePostFolderCommand } from "../application/commands/ensure-post-folder.command.js";
import { MovePostCommand } from "../application/commands/move-post.command.js";
import { PublishPostCommand } from "../application/commands/publish-post.command.js";
import { SetPostCoverCommand } from "../application/commands/set-post-cover.command.js";
import { SetPostTranslationCommand } from "../application/commands/set-post-translation.command.js";
import { UnpublishPostCommand } from "../application/commands/unpublish-post.command.js";
import { UpdatePostCommand } from "../application/commands/update-post.command.js";
import { GetPostQuery } from "../application/queries/get-post.query.js";
import {
  ListPostOptionsQuery,
  type PostOption,
} from "../application/queries/list-post-options.query.js";
import { ListPostsQuery } from "../application/queries/list-posts.query.js";
import type {
  PostSummary,
  PostView,
} from "../application/queries/post.view.js";
import { PostNotFoundError } from "../domain/post.errors.js";
import type { Actor } from "../domain/post.js";
import {
  type CreatePostDto,
  createPostSchema,
  type ListPostsDto,
  listPostsSchema,
  type MovePostDto,
  movePostSchema,
  type PostTranslationDto,
  type PublishPostDto,
  postFolderSchema,
  postOptionsSchema,
  postSummarySchema,
  postTranslationSchema,
  postViewSchema,
  publishPostSchema,
  type SetCoverDto,
  setCoverSchema,
  type UpdatePostDto,
  updatePostSchema,
} from "./posts.dto.js";

const toActor = (user: AuthUser): Actor => ({
  id: user.id,
  permissions: user.permissions,
});
const toId = (id: string | null) => (id === null ? null : BigInt(id));

// The panel's posts. Anyone signed in may write drafts; editing someone
// else's post or publishing needs editor/admin (domain checkCanEdit/Publish).
@ApiTags("posts")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@RequirePermission("post:edit:own", "post:edit:any")
@Controller("posts")
export class PostsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List posts (search with q)",
  })
  @ApiZodQuery(listPostsSchema)
  @ApiZodPaginatedResponse(postSummarySchema)
  async list(
    @Query(new ZodValidationPipe(listPostsSchema)) query: ListPostsDto,
  ): Promise<Paginated<PostSummary>> {
    const { limit, offset, ...filter } = query;
    const { items, total } = await this.queries.execute(
      new ListPostsQuery(filter, limit, offset),
    );
    return new Paginated(items, {
      total,
      limit,
      offset,
    });
  }

  @Get("options")
  @ApiOperation({
    summary: "All posts, for parent pickers",
  })
  @ApiZodResponse(postOptionsSchema)
  options(): Promise<PostOption[]> {
    return this.queries.execute(new ListPostOptionsQuery());
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a post",
  })
  @ApiZodResponse(postViewSchema)
  show(@Param("id", IdPipe) id: bigint): Promise<PostView> {
    return this.get(id);
  }

  @Post()
  @ApiOperation({
    summary: "Create a draft",
  })
  @ApiZodBody(createPostSchema)
  @ApiZodResponse(postViewSchema, {
    status: 201,
  })
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createPostSchema)) body: CreatePostDto,
  ): Promise<PostView> {
    const id = await this.commands.execute(
      new CreatePostCommand(body.title, toId(body.parentId), toActor(user)),
    );
    return this.get(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Edit title, content, description, tags, slug",
  })
  @ApiZodBody(updatePostSchema)
  @ApiZodResponse(postViewSchema)
  @ApiFailResponse(409, "Path taken by another post")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(updatePostSchema)) body: UpdatePostDto,
  ): Promise<PostView> {
    await this.commands.execute(new UpdatePostCommand(id, body, toActor(user)));
    return this.get(id);
  }

  @Post(":id/move")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Move under another post (null: the root)",
  })
  @ApiZodBody(movePostSchema)
  @ApiZodResponse(postViewSchema)
  async move(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(movePostSchema)) body: MovePostDto,
  ): Promise<PostView> {
    await this.commands.execute(
      new MovePostCommand(id, toId(body.parentId), toActor(user)),
    );
    return this.get(id);
  }

  @Post(":id/publish")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Publish now, or schedule with a future `at`",
  })
  @ApiZodBody(publishPostSchema)
  @ApiZodResponse(postViewSchema)
  async publish(
    @CurrentUser() user: AuthUser,
    @CurrentActor() requestActor: RequestActor,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(publishPostSchema)) body: PublishPostDto,
  ): Promise<PostView> {
    await this.commands.execute(
      new PublishPostCommand(
        id,
        toActor(user),
        body.at ? new Date(body.at) : undefined,
        metaOf(requestActor),
      ),
    );
    return this.get(id);
  }

  @Post(":id/unpublish")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Back to draft",
  })
  @ApiZodResponse(postViewSchema)
  async unpublish(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<PostView> {
    await this.commands.execute(new UnpublishPostCommand(id, toActor(user)));
    return this.get(id);
  }

  @Put(":id/cover")
  @ApiOperation({
    summary: "Set the cover image (assetId null removes it)",
  })
  @ApiZodBody(setCoverSchema)
  @ApiZodResponse(postViewSchema)
  async setCover(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(setCoverSchema)) body: SetCoverDto,
  ): Promise<PostView> {
    await this.commands.execute(
      new SetPostCoverCommand(id, toId(body.assetId), toActor(user)),
    );
    return this.get(id);
  }

  @Post(":id/folder")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "The post's folder in the media library (created on first use)",
  })
  @ApiZodResponse(postFolderSchema)
  async folder(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<{
    folderId: string;
  }> {
    const folderId = await this.commands.execute(
      new EnsurePostFolderCommand(id, toActor(user)),
    );
    return {
      folderId: String(folderId),
    };
  }

  @Put(":id/translations/:locale")
  @ApiOperation({
    summary: "Write the post's text in a non-default locale (ideas/i18n)",
  })
  @ApiZodBody(postTranslationSchema)
  @ApiZodResponse(postViewSchema)
  @ApiFailResponse(409, "Path taken in that locale")
  async translate(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Param("locale") locale: string,
    @Body(new ZodValidationPipe(postTranslationSchema))
    body: PostTranslationDto,
  ): Promise<PostView> {
    await this.commands.execute(
      new SetPostTranslationCommand(id, locale, body, toActor(user)),
    );
    return this.get(id);
  }

  @Delete(":id/translations/:locale")
  @ApiOperation({
    summary: "Remove a translation (the locale shows the default text)",
  })
  @ApiZodResponse(postViewSchema)
  async untranslate(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Param("locale") locale: string,
  ): Promise<PostView> {
    await this.commands.execute(
      new DeletePostTranslationCommand(id, locale, toActor(user)),
    );
    return this.get(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete (refused while it has child posts)",
  })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(new DeletePostCommand(id, toActor(user)));
  }

  private async get(id: bigint): Promise<PostView> {
    const post = await this.queries.execute(new GetPostQuery(id));
    if (!post) {
      throw new PostNotFoundError();
    }
    return post;
  }
}
