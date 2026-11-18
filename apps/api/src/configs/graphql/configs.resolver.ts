import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { JSONScalar } from "../../common/graphql/json.scalar.js";
import {
  type AuthUser,
  CurrentUser,
  Public,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { ResetConfigCommand } from "../application/commands/reset-config.command.js";
import { SetConfigCommand } from "../application/commands/set-config.command.js";
import { GetPublicConfigsQuery } from "../application/queries/get-public-configs.query.js";
import {
  type ConfigView,
  ListConfigsQuery,
} from "../application/queries/list-configs.query.js";
import { setConfigSchema } from "../http/configs.dto.js";
import { ConfigModel } from "./config.model.js";

const setArgs = new ZodValidationPipe(setConfigSchema);
const keyArg = {
  type: () => String,
} as const;

// Same as ConfigsController
@Resolver(() => ConfigModel)
export class ConfigsResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Public()
  @Query(() => JSONScalar, {
    description: "Public settings by key, defaults filled in",
  })
  publicConfigs(): Promise<Record<string, unknown>> {
    return this.queries.execute(new GetPublicConfigsQuery());
  }

  @RequirePermission("settings:manage")
  @Query(
    () => [
      ConfigModel,
    ],
    {
      description: "Every setting with its default",
    },
  )
  configs(): Promise<ConfigView[]> {
    return this.queries.execute(new ListConfigsQuery());
  }

  @RequirePermission("settings:manage")
  @Mutation(() => Boolean, {
    description: "Set a setting; the value's shape depends on the key",
  })
  async setConfig(
    @CurrentUser() user: AuthUser,
    @Args("key", keyArg) key: string,
    @Args("value", {
      type: () => JSONScalar,
      nullable: true,
    })
    value: unknown,
  ): Promise<boolean> {
    const body = setArgs.transform({
      value,
    });
    await this.commands.execute(new SetConfigCommand(key, body.value, user.id));
    return true;
  }

  @RequirePermission("settings:manage")
  @Mutation(() => Boolean, {
    description: "Reset a setting to its default",
  })
  async resetConfig(@Args("key", keyArg) key: string): Promise<boolean> {
    await this.commands.execute(new ResetConfigCommand(key));
    return true;
  }
}
