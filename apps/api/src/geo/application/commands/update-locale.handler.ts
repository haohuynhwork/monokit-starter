import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { LocaleNotFoundError } from "../../domain/geo.errors.js";
import { checkStaff } from "../../domain/geo.js";
import {
  LOCALE_REPOSITORY,
  type LocaleRepository,
} from "../../domain/locale.repository.js";
import { UpdateLocaleCommand } from "./update-locale.command.js";

@CommandHandler(UpdateLocaleCommand)
export class UpdateLocaleHandler
  implements ICommandHandler<UpdateLocaleCommand>
{
  constructor(
    @Inject(LOCALE_REPOSITORY)
    private readonly locales: LocaleRepository,
  ) {}

  async execute({
    localeId,
    input,
    actor,
  }: UpdateLocaleCommand): Promise<void> {
    checkStaff(actor);
    const locale = await this.locales.findById(localeId);
    if (!locale) {
      throw new LocaleNotFoundError();
    }
    locale.update(input);
    await this.locales.save(locale);
  }
}
