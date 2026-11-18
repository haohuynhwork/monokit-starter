import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { PageNotFoundError } from "../../domain/page.errors.js";
import {
  PAGE_REPOSITORY,
  type PageRepository,
} from "../../domain/page.repository.js";
import { UnpublishPageCommand } from "./unpublish-page.command.js";

@CommandHandler(UnpublishPageCommand)
export class UnpublishPageHandler
  implements ICommandHandler<UnpublishPageCommand>
{
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pages: PageRepository,
  ) {}

  async execute({ pageId }: UnpublishPageCommand): Promise<void> {
    const page = await this.pages.findById(pageId);
    if (!page) {
      throw new PageNotFoundError();
    }
    page.unpublish();
    await this.pages.save(page);
  }
}
