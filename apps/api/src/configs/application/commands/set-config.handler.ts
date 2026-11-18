import { Inject } from "@nestjs/common";
import { CommandHandler, EventBus, type ICommandHandler } from "@nestjs/cqrs";
import { isCountry } from "@packages/geo";
import { InvalidConfigValueError } from "../../domain/config.errors.js";
import { parseConfig, parseKey } from "../../domain/config.js";
import {
  CONFIG_REPOSITORY,
  type ConfigRepository,
} from "../../domain/config.repository.js";
import { ConfigUpdatedEvent } from "../../domain/events/config-updated.event.js";
import { SetConfigCommand } from "./set-config.command.js";

@CommandHandler(SetConfigCommand)
export class SetConfigHandler implements ICommandHandler<SetConfigCommand> {
  constructor(
    @Inject(CONFIG_REPOSITORY) private readonly configs: ConfigRepository,
    private readonly events: EventBus,
  ) {}

  async execute({
    key,
    value,
    actorId,
    meta,
  }: SetConfigCommand): Promise<void> {
    const k = parseKey(key);
    const config = parseConfig(k, value, await this.configs.get(k));
    // The domain checks the format; the country list is data from @packages/geo
    if (config.key === "shipping.countries" && Array.isArray(config.value)) {
      const unknown = config.value.filter((c) => !isCountry(c));
      if (unknown.length > 0) {
        throw new InvalidConfigValueError(
          config.key,
          `unknown countries: ${unknown.join(", ")}`,
        );
      }
    }
    await this.configs.set(config.key, config.value, actorId);
    // After the commit
    this.events.publish(new ConfigUpdatedEvent(config.key, actorId, meta));
  }
}
