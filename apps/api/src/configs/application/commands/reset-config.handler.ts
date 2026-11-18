import { Inject } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { parseKey } from "../../domain/config.js";
import {
  CONFIG_REPOSITORY,
  type ConfigRepository,
} from "../../domain/config.repository.js";
import { ResetConfigCommand } from "./reset-config.command.js";

@CommandHandler(ResetConfigCommand)
export class ResetConfigHandler implements ICommandHandler<ResetConfigCommand> {
  constructor(
    @Inject(CONFIG_REPOSITORY) private readonly configs: ConfigRepository,
  ) {}

  async execute({ key }: ResetConfigCommand): Promise<void> {
    await this.configs.reset(parseKey(key));
  }
}
