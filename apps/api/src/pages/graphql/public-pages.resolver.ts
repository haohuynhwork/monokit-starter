import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { Request } from "express";
import { Public } from "../../common/http/guards/auth.decorators.js";
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
  publicPageSchema,
} from "../http/pages.dto.js";
import { contactCommand } from "../http/pages.mapping.js";
import {
  ContactFormInput,
  MenuItemModel,
  PublicPageModel,
} from "./page.model.js";

const pathArgs = new ZodValidationPipe(publicPageSchema);

// Same as PublicPagesController: live pages only, no sign-in
@Public()
@Resolver(() => PublicPageModel)
export class PublicPagesResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Query(() => PublicPageModel, {
    description: "A live page by its path, layout resolved (not_found if none)",
  })
  async publicPage(
    @Args("path", {
      type: () => String,
    })
    path: string,
  ): Promise<PublicPageView> {
    const query = pathArgs.transform({
      path,
    });
    const page = await this.queries.execute(new GetPublicPageQuery(query.path));
    if (!page) {
      throw new PageNotFoundError();
    }
    return page;
  }

  @Query(
    () => [
      MenuItemModel,
    ],
    {
      description: "The site header menu",
    },
  )
  menu(): Promise<MenuItem[]> {
    return this.queries.execute(new GetMenuQuery());
  }

  @Mutation(() => Boolean, {
    description: "Send a message through a page's contact form",
  })
  @RateLimit({
    limit: 5,
    ttl: 10 * 60_000,
  })
  async sendContactMessage(
    @Args(
      "input",
      {
        type: () => ContactFormInput,
      },
      new ZodValidationPipe(contactSchema),
    )
    input: ContactDto,
    @Context("req") req: Request,
  ): Promise<boolean> {
    const command = contactCommand(
      input,
      req.ip ?? null,
      req.get("user-agent") ?? null,
    );
    if (command) {
      await this.commands.execute(command);
    }
    return true;
  }
}
