import { Inject } from "@nestjs/common";
import { CommandBus, CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { DetachAssetsCommand } from "../../../storage/application/commands/detach-assets.command.js";
import { PageLayoutNotFoundError } from "../../domain/page.errors.js";
import {
  PAGE_LAYOUT_REPOSITORY,
  type PageLayoutRepository,
} from "../../domain/page-layout.repository.js";
import { DeletePageLayoutCommand } from "./delete-page-layout.command.js";

@CommandHandler(DeletePageLayoutCommand)
export class DeletePageLayoutHandler
  implements ICommandHandler<DeletePageLayoutCommand>
{
  constructor(
    @Inject(PAGE_LAYOUT_REPOSITORY)
    private readonly layouts: PageLayoutRepository,
    private readonly commands: CommandBus,
  ) {}

  async execute({ layoutId }: DeletePageLayoutCommand): Promise<void> {
    const layout = await this.layouts.findById(layoutId);
    if (!layout) {
      throw new PageLayoutNotFoundError();
    }
    layout.delete(new Date(), await this.layouts.isUsed(layoutId));
    await this.layouts.save(layout);
    await this.commands.execute(
      new DetachAssetsCommand("page_layout", layoutId),
    );
  }
}
