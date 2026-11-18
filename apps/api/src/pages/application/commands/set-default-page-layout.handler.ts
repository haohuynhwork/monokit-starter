import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { PageLayoutNotFoundError } from "../../domain/page.errors.js";
import {
  PAGE_LAYOUT_REPOSITORY,
  type PageLayoutRepository,
} from "../../domain/page-layout.repository.js";
import { SetDefaultPageLayoutCommand } from "./set-default-page-layout.command.js";

@CommandHandler(SetDefaultPageLayoutCommand)
export class SetDefaultPageLayoutHandler
  implements ICommandHandler<SetDefaultPageLayoutCommand>
{
  constructor(
    @Inject(PAGE_LAYOUT_REPOSITORY)
    private readonly layouts: PageLayoutRepository,
  ) {}

  async execute({ layoutId }: SetDefaultPageLayoutCommand): Promise<void> {
    const layout = await this.layouts.findById(layoutId);
    if (!layout) {
      throw new PageLayoutNotFoundError();
    }
    if (layout.isDefault) {
      return;
    }
    layout.makeDefault();
    await this.layouts.save(layout);
  }
}
