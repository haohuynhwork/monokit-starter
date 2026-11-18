import { Logger, Module, type OnApplicationBootstrap } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { ReencryptConfigsCommand } from "./application/commands/reencrypt-configs.command.js";
import { ReencryptConfigsHandler } from "./application/commands/reencrypt-configs.handler.js";
import { ResetConfigHandler } from "./application/commands/reset-config.handler.js";
import { SetConfigHandler } from "./application/commands/set-config.handler.js";
import {
  GetConfigHandler,
  GetPublicConfigsHandler,
  ListConfigsHandler,
} from "./application/queries/config-handlers.js";
import { CONFIG_REPOSITORY } from "./domain/config.repository.js";
import { CONFIG_CIPHER } from "./domain/config-cipher.js";
import { ConfigsResolver } from "./graphql/configs.resolver.js";
import { ConfigsController } from "./http/configs.controller.js";
import { AesConfigCipher } from "./infrastructure/aes-config-cipher.js";
import { PrismaConfigRepository } from "./infrastructure/prisma-config.repository.js";

@Module({
  controllers: [
    ConfigsController,
  ],
  providers: [
    {
      provide: CONFIG_CIPHER,
      useFactory: () => AesConfigCipher.fromEnv(),
    },
    {
      provide: CONFIG_REPOSITORY,
      useClass: PrismaConfigRepository,
    },
    SetConfigHandler,
    ResetConfigHandler,
    ReencryptConfigsHandler,
    GetConfigHandler,
    GetPublicConfigsHandler,
    ListConfigsHandler,
    ConfigsResolver,
  ],
})
export class ConfigsModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(ConfigsModule.name);

  constructor(private readonly commands: CommandBus) {}

  // Finishes a APP_SECRET rotation (see AesConfigCipher)
  async onApplicationBootstrap(): Promise<void> {
    const n = await this.commands.execute(new ReencryptConfigsCommand());
    if (n > 0) {
      this.logger.log(
        `Re-encrypted ${n} setting(s) with the current APP_SECRET`,
      );
    }
  }
}
