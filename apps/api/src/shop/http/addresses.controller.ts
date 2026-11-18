import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  type AuthUser,
  CurrentUser,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import {
  ApiFailResponse,
  ApiZodBody,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { DeleteAddressCommand } from "../application/commands/delete-address.command.js";
import { SaveAddressCommand } from "../application/commands/save-address.command.js";
import { ListAddressesQuery } from "../application/queries/list-addresses.query.js";
import type { AddressView } from "../application/queries/shop.view.js";
import { AddressNotFoundError } from "../domain/shop.errors.js";
import {
  addressViewSchema,
  type CreateAddressDto,
  createAddressSchema,
  type UpdateAddressDto,
  updateAddressSchema,
} from "./shop.dto.js";

// The signed-in user's own shipping addresses
@ApiTags("shop")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@Controller("me/addresses")
export class AddressesController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: "My addresses, default first",
  })
  @ApiZodResponse(addressViewSchema.array())
  list(@CurrentUser() user: AuthUser): Promise<AddressView[]> {
    return this.queries.execute(new ListAddressesQuery(user.id));
  }

  @Post()
  @ApiOperation({
    summary: "Add an address (the first becomes the default)",
  })
  @ApiZodBody(createAddressSchema)
  @ApiZodResponse(addressViewSchema, {
    status: 201,
  })
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createAddressSchema)) body: CreateAddressDto,
  ): Promise<AddressView> {
    const { isDefault, ...fields } = body;
    const id = await this.commands.execute(
      new SaveAddressCommand(user.id, null, fields, isDefault),
    );
    return this.get(user.id, id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Edit an address, or make it the default",
  })
  @ApiZodBody(updateAddressSchema)
  @ApiZodResponse(addressViewSchema)
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(updateAddressSchema)) body: UpdateAddressDto,
  ): Promise<AddressView> {
    const { isDefault, ...fields } = body;
    await this.commands.execute(
      new SaveAddressCommand(user.id, id, fields, isDefault),
    );
    return this.get(user.id, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete an address (orders keep their copy)",
  })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(new DeleteAddressCommand(user.id, id));
  }

  private async get(userId: bigint, id: bigint): Promise<AddressView> {
    const all = await this.queries.execute(new ListAddressesQuery(userId));
    const address = all.find((a) => a.id === String(id));
    if (!address) {
      throw new AddressNotFoundError();
    }
    return address;
  }
}
