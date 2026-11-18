import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { DeletePostTagCommand } from "../application/commands/delete-post-tag.command.js";
import { RenamePostTagCommand } from "../application/commands/rename-post-tag.command.js";
import {
  ListPostTagsQuery,
  type PostTagView,
} from "../application/queries/list-post-tags.query.js";
import { listTagsSchema, renameTagSchema } from "../http/posts.dto.js";
import { AdminPostTagModel } from "./admin-post.model.js";

const listArgs = new ZodValidationPipe(listTagsSchema);
const renameArgs = new ZodValidationPipe(renameTagSchema);
const idArg = {
  type: () => ID,
} as const;

// Same as PostTagsController: tags are created by tagging a post; renaming
// and deleting need editor/admin (domain)
@RequirePermission("post:edit:own", "post:edit:any")
@Resolver(() => AdminPostTagModel)
export class PostTagsResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Query(
    () => [
      AdminPostTagModel,
    ],
    {
      description: "All tags by name (q: autocomplete)",
    },
  )
  adminPostTags(
    @Args("q", {
      type: () => String,
      nullable: true,
    })
    q?: string | null,
  ): Promise<PostTagView[]> {
    const query = listArgs.transform(
      q == null
        ? {}
        : {
            q,
          },
    );
    return this.queries.execute(
      new ListPostTagsQuery({
        live: false,
        q: query.q,
      }),
    );
  }

  @Mutation(() => Boolean, {
    description: "Rename (moves its /tags/<slug> page)",
  })
  async renamePostTag(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("name", {
      type: () => String,
    })
    name: string,
  ): Promise<boolean> {
    const body = renameArgs.transform({
      name,
    });
    await this.commands.execute(
      new RenamePostTagCommand(id, body.name, {
        id: user.id,
        permissions: user.permissions,
      }),
    );
    return true;
  }

  @Mutation(() => Boolean, {
    description: "Delete; posts lose the tag",
  })
  async deletePostTag(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(
      new DeletePostTagCommand(id, {
        id: user.id,
        permissions: user.permissions,
      }),
    );
    return true;
  }
}
