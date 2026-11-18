import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { HasPrivateAssetUsagesQuery } from "../../../storage/application/queries/has-private-asset-usages.query.js";
import { PageNotFoundError } from "../../domain/page.errors.js";
import {
  PAGE_REPOSITORY,
  type PageRepository,
} from "../../domain/page.repository.js";
import { PublishPageCommand } from "./publish-page.command.js";

@CommandHandler(PublishPageCommand)
export class PublishPageHandler implements ICommandHandler<PublishPageCommand> {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pages: PageRepository,
    private readonly queries: QueryBus,
  ) {}

  async execute({ pageId, at }: PublishPageCommand): Promise<void> {
    const page = await this.pages.findById(pageId);
    if (!page) {
      throw new PageNotFoundError();
    }
    page.publish(
      new Date(),
      {
        parentReachable: (await this.pages.pathOf(page.parentId)) !== null,
        hasPrivateFiles: await this.queries.execute(
          new HasPrivateAssetUsagesQuery("page", pageId),
        ),
      },
      at,
    );
    await this.pages.save(page);
  }
}
