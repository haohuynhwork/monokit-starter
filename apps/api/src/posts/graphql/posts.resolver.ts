import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { page } from "../../common/graphql/paginated.js";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
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
import type { PostView } from "../application/queries/post.view.js";
import { PostNotFoundError } from "../domain/post.errors.js";
import type { Actor } from "../domain/post.js";
import {
  createPostSchema,
  listPostsSchema,
  movePostSchema,
  postTranslationSchema,
  publishPostSchema,
  setCoverSchema,
  updatePostSchema,
} from "../http/posts.dto.js";
import {
  AdminPostModel,
  AdminPostPage,
  PostFolderModel,
  PostOptionModel,
  PostTranslationInput,
  UpdatePostInput,
} from "./admin-post.model.js";

const listArgs = new ZodValidationPipe(listPostsSchema);
const createArgs = new ZodValidationPipe(createPostSchema);
const updateArgs = new ZodValidationPipe(updatePostSchema);
const moveArgs = new ZodValidationPipe(movePostSchema);
const publishArgs = new ZodValidationPipe(publishPostSchema);
const coverArgs = new ZodValidationPipe(setCoverSchema);
const translationArgs = new ZodValidationPipe(postTranslationSchema);
const idArg = {
  type: () => ID,
} as const;
const optionalIdArg = {
  type: () => ID,
  nullable: true,
} as const;

const toActor = (user: AuthUser): Actor => ({
  id: user.id,
  permissions: user.permissions,
});
const toId = (id: string | null) => (id === null ? null : BigInt(id));
// Omitted GraphQL args arrive as undefined; drop them so zod defaults apply
const definedOnly = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

// Same as PostsController: the panel's posts, signed in (domain checks roles)
@RequirePermission("post:edit:own", "post:edit:any")
@Resolver(() => AdminPostModel)
export class PostsResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Query(() => AdminPostPage, {
    description: "List posts (search with q)",
  })
  async adminPosts(
    @Args("status", {
      type: () => String,
      nullable: true,
      description: "draft, scheduled or published",
    })
    status?: string,
    @Args("q", {
      type: () => String,
      nullable: true,
    })
    q?: string,
    @Args("tag", {
      type: () => String,
      nullable: true,
      description: "Tag slug",
    })
    tag?: string,
    @Args("limit", {
      type: () => Int,
      defaultValue: 20,
    })
    limit?: number,
    @Args("offset", {
      type: () => Int,
      defaultValue: 0,
    })
    offset?: number,
  ) {
    const {
      limit: l,
      offset: o,
      ...filter
    } = listArgs.transform(
      definedOnly({
        status: status ?? undefined,
        q: q ?? undefined,
        tag: tag ?? undefined,
        limit,
        offset,
      }),
    );
    const { items, total } = await this.queries.execute(
      new ListPostsQuery(filter, l, o),
    );
    return page({
      items,
      meta: {
        total,
        limit: l,
        offset: o,
      },
    });
  }

  @Query(
    () => [
      PostOptionModel,
    ],
    {
      description: "All posts, for parent pickers",
    },
  )
  postOptions(): Promise<PostOption[]> {
    return this.queries.execute(new ListPostOptionsQuery());
  }

  @Query(() => AdminPostModel, {
    description: "Get a post",
  })
  adminPost(@Args("id", idArg, IdPipe) id: bigint): Promise<PostView> {
    return this.get(id);
  }

  @Mutation(() => AdminPostModel, {
    description: "Create a draft",
  })
  async createPost(
    @CurrentUser() user: AuthUser,
    @Args("title", {
      type: () => String,
    })
    title: string,
    @Args("parentId", optionalIdArg) parentId?: string | null,
  ): Promise<PostView> {
    const body = createArgs.transform(
      definedOnly({
        title,
        parentId,
      }),
    );
    const id = await this.commands.execute(
      new CreatePostCommand(body.title, toId(body.parentId), toActor(user)),
    );
    return this.get(id);
  }

  @Mutation(() => AdminPostModel, {
    description: "Edit title, content, description, tags, slug",
  })
  async updatePost(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("input", {
      type: () => UpdatePostInput,
    })
    input: UpdatePostInput,
  ): Promise<PostView> {
    const body = updateArgs.transform(definedOnly(input));
    await this.commands.execute(new UpdatePostCommand(id, body, toActor(user)));
    return this.get(id);
  }

  @Mutation(() => AdminPostModel, {
    description: "Move under another post (null: the root)",
  })
  async movePost(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("parentId", optionalIdArg) parentId: string | null,
  ): Promise<PostView> {
    const body = moveArgs.transform({
      parentId: parentId ?? null,
    });
    await this.commands.execute(
      new MovePostCommand(id, toId(body.parentId), toActor(user)),
    );
    return this.get(id);
  }

  @Mutation(() => AdminPostModel, {
    description: "Publish now, or schedule with a future `at`",
  })
  async publishPost(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("at", {
      type: () => String,
      nullable: true,
      description: "ISO 8601; omit to publish now",
    })
    at?: string | null,
  ): Promise<PostView> {
    const body = publishArgs.transform(
      at
        ? {
            at,
          }
        : {},
    );
    await this.commands.execute(
      new PublishPostCommand(
        id,
        toActor(user),
        body.at ? new Date(body.at) : undefined,
      ),
    );
    return this.get(id);
  }

  @Mutation(() => AdminPostModel, {
    description: "Back to draft",
  })
  async unpublishPost(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<PostView> {
    await this.commands.execute(new UnpublishPostCommand(id, toActor(user)));
    return this.get(id);
  }

  @Mutation(() => AdminPostModel, {
    description: "Set the cover image (assetId null removes it)",
  })
  async setPostCover(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("assetId", optionalIdArg) assetId: string | null,
  ): Promise<PostView> {
    const body = coverArgs.transform({
      assetId: assetId ?? null,
    });
    await this.commands.execute(
      new SetPostCoverCommand(id, toId(body.assetId), toActor(user)),
    );
    return this.get(id);
  }

  @Mutation(() => PostFolderModel, {
    description:
      "The post's folder in the media library (created on first use)",
  })
  async ensurePostFolder(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<PostFolderModel> {
    const folderId = await this.commands.execute(
      new EnsurePostFolderCommand(id, toActor(user)),
    );
    return {
      folderId: String(folderId),
    };
  }

  @Mutation(() => AdminPostModel, {
    description: "Write the post's text in a non-default locale",
  })
  async setPostTranslation(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("locale", {
      type: () => String,
    })
    locale: string,
    @Args("input", {
      type: () => PostTranslationInput,
    })
    input: PostTranslationInput,
  ): Promise<PostView> {
    const body = translationArgs.transform(
      definedOnly({
        title: input.title,
        slug: input.slug,
        content: input.content ?? undefined,
        description: input.description,
      }),
    );
    await this.commands.execute(
      new SetPostTranslationCommand(id, locale, body, toActor(user)),
    );
    return this.get(id);
  }

  @Mutation(() => AdminPostModel, {
    description: "Remove a translation (the locale shows the default text)",
  })
  async deletePostTranslation(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("locale", {
      type: () => String,
    })
    locale: string,
  ): Promise<PostView> {
    await this.commands.execute(
      new DeletePostTranslationCommand(id, locale, toActor(user)),
    );
    return this.get(id);
  }

  @Mutation(() => Boolean, {
    description: "Delete (refused while it has child posts)",
  })
  async deletePost(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new DeletePostCommand(id, toActor(user)));
    return true;
  }

  private async get(id: bigint): Promise<PostView> {
    const post = await this.queries.execute(new GetPostQuery(id));
    if (!post) {
      throw new PostNotFoundError();
    }
    return post;
  }
}
