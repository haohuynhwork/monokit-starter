import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { checkStaff } from "../../domain/geo.js";
import { Locale } from "../../domain/locale.js";
import {
  LOCALE_REPOSITORY,
  type LocaleRepository,
} from "../../domain/locale.repository.js";
import { CreateLocaleCommand } from "./create-locale.command.js";

@CommandHandler(CreateLocaleCommand)
export class CreateLocaleHandler
  implements ICommandHandler<CreateLocaleCommand>
{
  constructor(
    @Inject(LOCALE_REPOSITORY)
    private readonly locales: LocaleRepository,
  ) {}

  async execute({ input, actor }: CreateLocaleCommand): Promise<bigint> {
    checkStaff(actor);
    const first = !(await this.locales.hasAny());
    const locale = Locale.create({
      ...input,
      isDefault: first || !!input.isDefault,
    });
    await this.locales.save(locale);
    return locale.id!;
  }
}
