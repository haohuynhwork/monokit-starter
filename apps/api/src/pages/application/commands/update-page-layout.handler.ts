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
import { PageLayoutNotFoundError } from "../../domain/page.errors.js";
import {
  PAGE_LAYOUT_REPOSITORY,
  type PageLayoutRepository,
} from "../../domain/page-layout.repository.js";
import { saveLayout } from "./page-layout-save.js";
import { UpdatePageLayoutCommand } from "./update-page-layout.command.js";

@CommandHandler(UpdatePageLayoutCommand)
export class UpdatePageLayoutHandler
  implements ICommandHandler<UpdatePageLayoutCommand>
{
  constructor(
    @Inject(PAGE_LAYOUT_REPOSITORY)
    readonly layouts: PageLayoutRepository,
    @Inject(HTML_SANITIZER) readonly sanitizer: HtmlSanitizer,
    readonly commands: CommandBus,
    readonly queries: QueryBus,
  ) {}

  async execute({ layoutId, changes }: UpdatePageLayoutCommand): Promise<void> {
    const layout = await this.layouts.findById(layoutId);
    if (!layout) {
      throw new PageLayoutNotFoundError();
    }
    layout.edit(changes);
    await saveLayout(layout, this);
  }
}
