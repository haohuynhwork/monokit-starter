import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { LocaleNotFoundError } from "../../domain/geo.errors.js";
import { checkStaff } from "../../domain/geo.js";
import {
  LOCALE_REPOSITORY,
  type LocaleRepository,
} from "../../domain/locale.repository.js";
import { DeleteLocaleCommand } from "./delete-locale.command.js";

@CommandHandler(DeleteLocaleCommand)
export class DeleteLocaleHandler
  implements ICommandHandler<DeleteLocaleCommand>
{
  constructor(
    @Inject(LOCALE_REPOSITORY)
    private readonly locales: LocaleRepository,
  ) {}

  async execute({ localeId, actor }: DeleteLocaleCommand): Promise<void> {
    checkStaff(actor);
    const locale = await this.locales.findById(localeId);
    if (!locale) {
      throw new LocaleNotFoundError();
    }
    locale.checkDeletable();
    await this.locales.delete(localeId);
  }
}
