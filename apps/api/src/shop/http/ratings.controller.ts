import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import { ApiFailResponse, ApiZodBody } from "../../common/http/setup/openapi.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { DeleteRatingCommand } from "../application/commands/delete-rating.command.js";
import { RateProductCommand } from "../application/commands/rate-product.command.js";
import { type RateDto, rateSchema } from "./shop.dto.js";

@ApiTags("shop")
@ApiBearerAuth()
@ApiFailResponse(401, "Missing or invalid token")
@Controller()
export class RatingsController {
  constructor(private readonly commands: CommandBus) {}

  @Put("products/:id/ratings/me")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Rate a product you received (replaces yours)",
  })
  @ApiZodBody(rateSchema)
  @ApiNoContentResponse()
  @ApiFailResponse(403, "No delivered order with this product")
  async rate(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
    @Body(new ZodValidationPipe(rateSchema)) body: RateDto,
  ): Promise<void> {
    await this.commands.execute(
      new RateProductCommand(user.id, id, body.stars, body.body),
    );
  }

  @Delete("products/:id/ratings/me")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Remove your rating",
  })
  @ApiNoContentResponse()
  async removeMine(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(
      new DeleteRatingCommand(
        {
          productId: id,
        },
        user,
      ),
    );
  }

  @Delete("ratings/:id")
  @RequirePermission("rating:delete:any")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Remove any rating (admin)",
  })
  @ApiNoContentResponse()
  async remove(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(
      new DeleteRatingCommand(
        {
          ratingId: id,
        },
        user,
      ),
    );
  }
}
