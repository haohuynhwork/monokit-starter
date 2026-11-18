import { QueryBus } from "@nestjs/cqrs";
import { Args, ID, Int, Query, Resolver } from "@nestjs/graphql";
import { page } from "../../common/graphql/paginated.js";
import { Public } from "../../common/http/guards/auth.decorators.js";
import { RequestLocale } from "../../common/http/request/request-locale.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { GetPublicPostQuery } from "../application/queries/get-public-post.query.js";
import { ListPostTagsQuery } from "../application/queries/list-post-tags.query.js";
import {
  CountPublicPostsQuery,
  ListPublicPostsQuery,
} from "../application/queries/list-public-posts.query.js";
import type { PublicPostView } from "../application/queries/post.view.js";
import { publicListSchema, publicPostSchema } from "../http/posts.dto.js";
import { PostModel, PostPage, PostTagModel } from "./post.model.js";

const listArgs = new ZodValidationPipe(publicListSchema);
const postArgs = new ZodValidationPipe(publicPostSchema);
const localeArg = {
  type: () => String,
  nullable: true,
  description:
    "Locale code (else Accept-Language, else the default); untranslated posts fall back to the default",
} as const;
// The `locale` argument first, then what the request asks for
const locales = (arg: string | undefined, requested: string[]) =>
  arg
    ? [
        arg,
        ...requested,
      ]
    : requested;

// Same reads as PublicPostsController: live posts only, no sign-in.
@Public()
@Resolver(() => PostModel)
export class PublicPostsResolver {
  constructor(private readonly queries: QueryBus) {}

  @Query(
    () => [
      PostModel,
    ],
    {
      description: "Latest live posts, newest first (content left out)",
    },
  )
  posts(
    @Args("limit", {
      type: () => Int,
      defaultValue: 10,
    })
    limit: number,
    @Args("tag", {
      type: () => String,
      nullable: true,
      description: "Tag slug",
    })
    tag?: string,
    @Args("tagId", {
      type: () => ID,
      nullable: true,
    })
    tagId?: string,
    @Args("locale", localeArg) locale?: string,
    @RequestLocale() requested: string[] = [],
  ): Promise<PublicPostView[]> {
    const query = listArgs.transform({
      limit,
      tag,
      tagId,
    });
    return this.queries.execute(
      new ListPublicPostsQuery(
        query.limit,
        query.tag,
        query.tagId ? BigInt(query.tagId) : undefined,
        undefined,
        0,
        locales(locale, requested),
      ),
    );
  }

  @Query(() => PostPage, {
    description:
      "Latest live posts, paged (search with q, filter by tag); content left out",
  })
  async postPage(
    @Args("limit", {
      type: () => Int,
      defaultValue: 10,
    })
    limit: number,
    @Args("offset", {
      type: () => Int,
      defaultValue: 0,
    })
    offset: number,
    @Args("tag", {
      type: () => String,
      nullable: true,
      description: "Tag slug",
    })
    tag?: string | null,
    @Args("tagId", {
      type: () => ID,
      nullable: true,
    })
    tagId?: string | null,
    @Args("q", {
      type: () => String,
      nullable: true,
      description: "Full-text search of title and content; best matches first",
    })
    q?: string | null,
    @Args("locale", localeArg) locale?: string,
    @RequestLocale() requested: string[] = [],
  ) {
    const query = listArgs.transform({
      limit,
      offset,
      tag: tag ?? undefined,
      tagId: tagId ?? undefined,
      q: q ?? undefined,
    });
    const id = query.tagId ? BigInt(query.tagId) : undefined;
    const [items, total] = await Promise.all([
      this.queries.execute(
        new ListPublicPostsQuery(
          query.limit,
          query.tag,
          id,
          query.q,
          query.offset,
          locales(locale, requested),
        ),
      ),
      this.queries.execute(
        new CountPublicPostsQuery({
          tag: query.tag,
          tagId: id,
          q: query.q,
        }),
      ),
    ]);
    return page({
      items,
      meta: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
    });
  }

  @Query(() => PostModel, {
    nullable: true,
    description: "A live post by its path; null when there is none",
  })
  post(
    @Args("path", {
      type: () => String,
    })
    path: string,
    @Args("locale", localeArg) locale?: string,
    @RequestLocale() requested: string[] = [],
  ): Promise<PublicPostView | null> {
    return this.queries.execute(
      new GetPublicPostQuery(
        postArgs.transform({
          path,
        }).path,
        locales(locale, requested),
      ),
    );
  }

  @Query(
    () => [
      PostTagModel,
    ],
    {
      description: "Tags with live posts, by name",
    },
  )
  async postTags(): Promise<PostTagModel[]> {
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
}
