import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import {
  CONFIG_REPOSITORY,
  type ConfigRepository,
} from "../../domain/config.repository.js";
import { ReencryptConfigsCommand } from "./reencrypt-configs.command.js";

@CommandHandler(ReencryptConfigsCommand)
export class ReencryptConfigsHandler
  implements ICommandHandler<ReencryptConfigsCommand>
{
  constructor(
    @Inject(CONFIG_REPOSITORY) private readonly configs: ConfigRepository,
  ) {}

  execute(): Promise<number> {
    return this.configs.reencrypt();
  }
}
