import { Controller, Get, Query } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/http/guards/auth.decorators.js";
import {
  ApiFailResponse,
  ApiZodPaginatedResponse,
  ApiZodQuery,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { Paginated } from "../../common/http/responses/paginated.js";
import { RequestLocale } from "../../common/http/request/request-locale.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { GetPublicPostQuery } from "../application/queries/get-public-post.query.js";
import type { PostTagView } from "../application/queries/list-post-tags.query.js";
import { ListPostTagsQuery } from "../application/queries/list-post-tags.query.js";
import {
  CountPublicPostsQuery,
  ListPublicPostsQuery,
} from "../application/queries/list-public-posts.query.js";
import type { PublicPostView } from "../application/queries/post.view.js";
import { PostNotFoundError } from "../domain/post.errors.js";
import {
  type PublicListDto,
  type PublicPostDto,
  publicListSchema,
  publicPostSchema,
  publicPostTagSchema,
  publicPostViewSchema,
} from "./posts.dto.js";

type PublicPostTag = Omit<PostTagView, "id">;

// What the website reads: live posts only, no sign-in
@ApiTags("public")
@Public()
@Controller("public/posts")
export class PublicPostsController {
  constructor(private readonly queries: QueryBus) {}

  @Get()
  @ApiOperation({
    summary: "Latest live posts, paged (search with q, filter by tag)",
  })
  @ApiZodQuery(publicListSchema)
  @ApiZodPaginatedResponse(publicPostViewSchema)
  async latest(
    @Query(new ZodValidationPipe(publicListSchema)) query: PublicListDto,
    @RequestLocale() locale: string[],
  ): Promise<Paginated<PublicPostView>> {
    const { limit, offset, tag, q } = query;
    const tagId = query.tagId ? BigInt(query.tagId) : undefined;
    const [items, total] = await Promise.all([
      this.queries.execute(
        new ListPublicPostsQuery(limit, tag, tagId, q, offset, locale),
      ),
      this.queries.execute(
        new CountPublicPostsQuery({
          tag,
          tagId,
          q,
        }),
      ),
    ]);
    return new Paginated(items, {
      total,
      limit,
      offset,
    });
  }

  @Get("tags")
  @ApiOperation({
    summary: "Tags with live posts, by name",
  })
  @ApiZodResponse(publicPostTagSchema.array())
  async tags(): Promise<PublicPostTag[]> {
    const tags = await this.queries.execute(
      new ListPostTagsQuery({
        live: true,
      }),
    );
    return tags.map(({ name, slug, postCount }) => ({
      name,
      slug,
      postCount,
    }));
  }

  @Get("by-path")
  @ApiOperation({
    summary: "A live post by its path",
  })
  @ApiZodQuery(publicPostSchema)
  @ApiZodResponse(publicPostViewSchema)
  @ApiFailResponse(404, "No live post at this path")
  async byPath(
    @Query(new ZodValidationPipe(publicPostSchema)) query: PublicPostDto,
    @RequestLocale() locale: string[],
  ): Promise<PublicPostView> {
    const post = await this.queries.execute(
      new GetPublicPostQuery(query.path, locale),
    );
    if (!post) {
      throw new PostNotFoundError();
    }
    return post;
  }
}
