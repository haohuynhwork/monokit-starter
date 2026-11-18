import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import {
  type AuthUser,
  CurrentUser,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { DeleteAddressCommand } from "../application/commands/delete-address.command.js";
import { SaveAddressCommand } from "../application/commands/save-address.command.js";
import { ListAddressesQuery } from "../application/queries/list-addresses.query.js";
import type { AddressView } from "../application/queries/shop.view.js";
import { AddressNotFoundError } from "../domain/shop.errors.js";
import {
  type CreateAddressDto,
  createAddressSchema,
  type UpdateAddressDto,
  updateAddressSchema,
} from "../http/shop.dto.js";
import { ShopAddressInput, ShopAddressModel } from "./account.model.js";

const idArg = {
  type: () => ID,
} as const;
const inputArg = {
  type: () => ShopAddressInput,
} as const;

// Same as AddressesController: the signed-in user's shipping addresses
@Resolver(() => ShopAddressModel)
export class AddressesResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Query(
    () => [
      ShopAddressModel,
    ],
    {
      description: "My addresses, default first",
    },
  )
  myAddresses(@CurrentUser() user: AuthUser): Promise<AddressView[]> {
    return this.queries.execute(new ListAddressesQuery(user.id));
  }

  @Mutation(() => ShopAddressModel, {
    description: "Add an address (the first becomes the default)",
  })
  async createMyAddress(
    @CurrentUser() user: AuthUser,
    @Args("input", inputArg, new ZodValidationPipe(createAddressSchema))
    body: CreateAddressDto,
  ): Promise<AddressView> {
    const { isDefault, ...fields } = body;
    const id = await this.commands.execute(
      new SaveAddressCommand(user.id, null, fields, isDefault),
    );
    return this.get(user.id, id);
  }

  @Mutation(() => ShopAddressModel, {
    description: "Edit an address, or make it the default",
  })
  async updateMyAddress(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
    @Args("input", inputArg, new ZodValidationPipe(updateAddressSchema))
    body: UpdateAddressDto,
  ): Promise<AddressView> {
    const { isDefault, ...fields } = body;
    await this.commands.execute(
      new SaveAddressCommand(user.id, id, fields, isDefault),
    );
    return this.get(user.id, id);
  }

  @Mutation(() => Boolean, {
    description: "Delete an address (orders keep their copy)",
  })
  async deleteMyAddress(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new DeleteAddressCommand(user.id, id));
    return true;
  }

  private async get(userId: bigint, id: bigint): Promise<AddressView> {
    const all: AddressView[] = await this.queries.execute(
      new ListAddressesQuery(userId),
    );
    const address = all.find((a) => a.id === String(id));
    if (!address) {
      throw new AddressNotFoundError();
    }
    return address;
  }
}
