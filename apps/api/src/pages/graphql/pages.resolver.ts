import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
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
  publishPageSchema,
  type UpdatePageDto,
  updatePageSchema,
} from "../http/pages.dto.js";
import { getPage, toId, updatePageCommand } from "../http/pages.mapping.js";
import {
  CreatePageInput,
  PageModel,
  PageSummaryModel,
  UpdatePageInput,
} from "./page.model.js";

const idArg = {
  type: () => ID,
} as const;

// Same as PagesController: site structure, editors and admins only
@RequirePermission("page:manage")
@Resolver(() => PageModel)
export class PagesResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Query(
    () => [
      PageSummaryModel,
    ],
    {
      description: "Every page (tree rows, no settings)",
    },
  )
  pages(): Promise<PageSummary[]> {
    return this.queries.execute(new ListPagesQuery());
  }

  @Query(() => PageModel, {
    description: "A page with its settings",
  })
  page(@Args("id", idArg, IdPipe) id: bigint): Promise<PageView> {
    return getPage(this.queries, id);
  }

  @Mutation(() => PageModel, {
    description: "Create a draft",
  })
  async createPage(
    @CurrentUser() user: AuthUser,
    @Args(
      "input",
      {
        type: () => CreatePageInput,
      },
      new ZodValidationPipe(createPageSchema),
    )
    input: CreatePageDto,
  ): Promise<PageView> {
    const id = await this.commands.execute(
      new CreatePageCommand(
        input.title,
        toId(input.parentId),
        toId(input.layoutId),
        user.id,
      ),
    );
    return getPage(this.queries, id);
  }

  @Mutation(() => PageModel, {
    description: "Edit title, description, slug, settings, layout, menu",
  })
  async updatePage(
    @Args("id", idArg, IdPipe) id: bigint,
    @Args(
      "input",
      {
        type: () => UpdatePageInput,
      },
      new ZodValidationPipe(updatePageSchema),
    )
    input: UpdatePageDto,
  ): Promise<PageView> {
    await this.commands.execute(updatePageCommand(id, input));
    return getPage(this.queries, id);
  }

  @Mutation(() => PageModel, {
    description: "Move under another page (null: the root)",
  })
  async movePage(
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("parentId", {
      type: () => ID,
      nullable: true,
    })
    parentId: string | null = null,
  ): Promise<PageView> {
    const body: MovePageDto = new ZodValidationPipe(movePageSchema).transform({
      parentId,
    });
    await this.commands.execute(new MovePageCommand(id, toId(body.parentId)));
    return getPage(this.queries, id);
  }

  @Mutation(() => PageModel, {
    description: "Publish now, or schedule with a future `at` (ISO 8601)",
  })
  async publishPage(
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("at", {
      type: () => String,
      nullable: true,
    })
    at?: string | null,
  ): Promise<PageView> {
    const body: PublishPageDto = new ZodValidationPipe(
      publishPageSchema,
    ).transform({
      at: at ?? undefined,
    });
    await this.commands.execute(
      new PublishPageCommand(id, body.at ? new Date(body.at) : undefined),
    );
    return getPage(this.queries, id);
  }

  @Mutation(() => PageModel, {
    description: "Back to draft",
  })
  async unpublishPage(
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<PageView> {
    await this.commands.execute(new UnpublishPageCommand(id));
    return getPage(this.queries, id);
  }

  @Mutation(() => Boolean, {
    description: "Delete (refused while it has child pages)",
  })
  async deletePage(@Args("id", idArg, IdPipe) id: bigint): Promise<boolean> {
    await this.commands.execute(new DeletePageCommand(id));
    return true;
  }
}
