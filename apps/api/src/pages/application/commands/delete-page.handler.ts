import { Inject } from "@nestjs/common";
import { CommandBus, CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { DetachAssetsCommand } from "../../../storage/application/commands/detach-assets.command.js";
import { PageNotFoundError } from "../../domain/page.errors.js";
import {
  PAGE_REPOSITORY,
  type PageRepository,
} from "../../domain/page.repository.js";
import { DeletePageCommand } from "./delete-page.command.js";

@CommandHandler(DeletePageCommand)
export class DeletePageHandler implements ICommandHandler<DeletePageCommand> {
  constructor(
    @Inject(PAGE_REPOSITORY) private readonly pages: PageRepository,
    private readonly commands: CommandBus,
  ) {}

  async execute({ pageId }: DeletePageCommand): Promise<void> {
    const page = await this.pages.findById(pageId);
    if (!page) {
      throw new PageNotFoundError();
    }
    page.delete(new Date(), await this.pages.hasLiveChildren(pageId));
    await this.pages.save(page);
    // The files stay in the library
    await this.commands.execute(new DetachAssetsCommand("page", pageId));
  }
}
