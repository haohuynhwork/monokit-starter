import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  PageLayoutNotFoundError,
  PageNotFoundError,
} from "../../domain/page.errors.js";
import { Page } from "../../domain/page.js";
import {
  PAGE_REPOSITORY,
  type PageRepository,
} from "../../domain/page.repository.js";
import {
  PAGE_LAYOUT_REPOSITORY,
  type PageLayoutRepository,
} from "../../domain/page-layout.repository.js";
import { CreatePageCommand } from "./create-page.command.js";

@CommandHandler(CreatePageCommand)
export class CreatePageHandler implements ICommandHandler<CreatePageCommand> {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pages: PageRepository,
    @Inject(PAGE_LAYOUT_REPOSITORY)
    private readonly layouts: PageLayoutRepository,
  ) {}

  async execute({
    title,
    parentId,
    layoutId,
    authorId,
  }: CreatePageCommand): Promise<bigint> {
    if (parentId !== null && !(await this.pages.findById(parentId))) {
      throw new PageNotFoundError();
    }
    if (layoutId !== null && !(await this.layouts.findById(layoutId))) {
      throw new PageLayoutNotFoundError();
    }
    const page = Page.draft({
      title,
      authorId,
      parentId,
      layoutId,
    });
    await this.pages.save(page);
    return page.id!;
  }
}
