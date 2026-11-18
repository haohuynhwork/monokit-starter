import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { RequirePermission } from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
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
  type UpdatePageLayoutDto,
  updatePageLayoutSchema,
} from "../http/pages.dto.js";
import { getPageLayout } from "../http/pages.mapping.js";
import {
  PageLayoutInput,
  PageLayoutModel,
  UpdatePageLayoutInput,
} from "./page.model.js";

const idArg = {
  type: () => ID,
} as const;

// Same as PageLayoutsController: editors and admins
@RequirePermission("page:manage")
@Resolver(() => PageLayoutModel)
export class PageLayoutsResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Query(
    () => [
      PageLayoutModel,
    ],
    {
      description: "Every layout with how many pages use it",
    },
  )
  pageLayouts(): Promise<PageLayoutView[]> {
    return this.queries.execute(new ListPageLayoutsQuery());
  }

  @Query(() => PageLayoutModel)
  pageLayout(@Args("id", idArg, IdPipe) id: bigint): Promise<PageLayoutView> {
    return getPageLayout(this.queries, id);
  }

  @Mutation(() => PageLayoutModel, {
    description: "Create a layout (the first one is the default)",
  })
  async createPageLayout(
    @Args(
      "input",
      {
        type: () => PageLayoutInput,
      },
      new ZodValidationPipe(pageLayoutSchema),
    )
    input: PageLayoutDto,
  ): Promise<PageLayoutView> {
    const id = await this.commands.execute(
      new CreatePageLayoutCommand(input.name, input.settings),
    );
    return getPageLayout(this.queries, id);
  }

  @Mutation(() => PageLayoutModel, {
    description: "Rename or change its settings",
  })
  async updatePageLayout(
    @Args("id", idArg, IdPipe) id: bigint,
    @Args(
      "input",
      {
        type: () => UpdatePageLayoutInput,
      },
      new ZodValidationPipe(updatePageLayoutSchema),
    )
    input: UpdatePageLayoutDto,
  ): Promise<PageLayoutView> {
    await this.commands.execute(new UpdatePageLayoutCommand(id, input));
    return getPageLayout(this.queries, id);
  }

  @Mutation(() => PageLayoutModel, {
    description: "Make it the layout of pages that pick none",
  })
  async setDefaultPageLayout(
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<PageLayoutView> {
    await this.commands.execute(new SetDefaultPageLayoutCommand(id));
    return getPageLayout(this.queries, id);
  }

  @Mutation(() => Boolean, {
    description: "Delete (not the default, not while in use)",
  })
  async deletePageLayout(
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new DeletePageLayoutCommand(id));
    return true;
  }
}
