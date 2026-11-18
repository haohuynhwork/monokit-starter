import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { PageNotFoundError } from "../../domain/page.errors.js";
import {
  PAGE_REPOSITORY,
  type PageRepository,
} from "../../domain/page.repository.js";
import { checkPathFree } from "../page-path.js";
import { MovePageCommand } from "./move-page.command.js";

@CommandHandler(MovePageCommand)
export class MovePageHandler implements ICommandHandler<MovePageCommand> {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pages: PageRepository,
    private readonly queries: QueryBus,
  ) {}

  async execute({ pageId, parentId }: MovePageCommand): Promise<void> {
    const page = await this.pages.findById(pageId);
    if (!page) {
      throw new PageNotFoundError();
    }
    if (page.parentId === parentId) {
      return;
    }
    if (parentId !== null && !(await this.pages.findById(parentId))) {
      throw new PageNotFoundError();
    }
    const inside =
      parentId !== null && (await this.pages.isInSubtree(pageId, parentId));
    page.moveTo(parentId, inside);
    await checkPathFree(page, this.pages, this.queries);
    await this.pages.save(page);
  }
}
