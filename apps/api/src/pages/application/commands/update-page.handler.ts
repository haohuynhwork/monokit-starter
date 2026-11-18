import { Inject } from "@nestjs/common";
import {
  CommandBus,
  CommandHandler,
  type ICommandHandler,
  QueryBus,
} from "@nestjs/cqrs";
import {
  HTML_SANITIZER,
  type HtmlSanitizer,
} from "../../../common/domain/html.js";
import {
  PageLayoutNotFoundError,
  PageNotFoundError,
} from "../../domain/page.errors.js";
import {
  PAGE_REPOSITORY,
  type PageRepository,
} from "../../domain/page.repository.js";
import {
  PAGE_LAYOUT_REPOSITORY,
  type PageLayoutRepository,
} from "../../domain/page-layout.repository.js";
import { attachFiles, findFileIds } from "../page-files.js";
import { checkPathFree } from "../page-path.js";
import { UpdatePageCommand } from "./update-page.command.js";

@CommandHandler(UpdatePageCommand)
export class UpdatePageHandler implements ICommandHandler<UpdatePageCommand> {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pages: PageRepository,
    @Inject(PAGE_LAYOUT_REPOSITORY)
    private readonly layouts: PageLayoutRepository,
    @Inject(HTML_SANITIZER) private readonly sanitizer: HtmlSanitizer,
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  async execute({ pageId, changes }: UpdatePageCommand): Promise<void> {
    const page = await this.pages.findById(pageId);
    if (!page) {
      throw new PageNotFoundError();
    }
    const { slug, settings, ...rest } = changes;
    if (
      rest.layoutId !== undefined &&
      rest.layoutId !== null &&
      !(await this.layouts.findById(rest.layoutId))
    ) {
      throw new PageLayoutNotFoundError();
    }
    page.edit(rest);
    if (settings !== undefined) {
      page.setSettings(settings, (html) => this.sanitizer.sanitize(html));
    }
    if (slug !== undefined) {
      page.setSlug(slug);
      await checkPathFree(page, this.pages, this.queries);
    }
    const fileIds =
      settings !== undefined
        ? await findFileIds(this.queries, page.fileKeys(), page.assetKeys())
        : null;
    await this.pages.save(page);
    if (fileIds) {
      await attachFiles(this.commands, "page", pageId, fileIds);
    }
  }
}
