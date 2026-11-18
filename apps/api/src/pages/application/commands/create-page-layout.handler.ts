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
import { PageLayout } from "../../domain/page-layout.js";
import {
  PAGE_LAYOUT_REPOSITORY,
  type PageLayoutRepository,
} from "../../domain/page-layout.repository.js";
import { CreatePageLayoutCommand } from "./create-page-layout.command.js";
import { saveLayout } from "./page-layout-save.js";

@CommandHandler(CreatePageLayoutCommand)
export class CreatePageLayoutHandler
  implements ICommandHandler<CreatePageLayoutCommand>
{
  constructor(
    @Inject(PAGE_LAYOUT_REPOSITORY)
    readonly layouts: PageLayoutRepository,
    @Inject(HTML_SANITIZER) readonly sanitizer: HtmlSanitizer,
    readonly commands: CommandBus,
    readonly queries: QueryBus,
  ) {}

  async execute({ name, settings }: CreatePageLayoutCommand): Promise<bigint> {
    const layout = PageLayout.create({
      name,
      settings,
    });
    // The first layout becomes the default
    if (!(await this.layouts.findDefault())) {
      layout.makeDefault();
    }
    await saveLayout(layout, this);
    return layout.id!;
  }
}
