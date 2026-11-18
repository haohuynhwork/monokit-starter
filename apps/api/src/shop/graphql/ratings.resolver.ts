import { CommandBus } from "@nestjs/cqrs";
import { Args, ID, Int, Mutation, Resolver } from "@nestjs/graphql";
import {
  type AuthUser,
  CurrentUser,
  RequirePermission,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { DeleteRatingCommand } from "../application/commands/delete-rating.command.js";
import { RateProductCommand } from "../application/commands/rate-product.command.js";
import { rateSchema } from "../http/shop.dto.js";
import { ShopRatingModel } from "./catalog.model.js";

const rateArgs = new ZodValidationPipe(rateSchema);
const idArg = {
  type: () => ID,
} as const;

// Same as RatingsController: any signed-in user rates, admins moderate
@Resolver(() => ShopRatingModel)
export class RatingsResolver {
  constructor(private readonly commands: CommandBus) {}

  @Mutation(() => Boolean, {
    description: "Rate a product you received (replaces yours)",
  })
  async rateProduct(
    @CurrentUser() user: AuthUser,
    @Args("productId", idArg, IdPipe) productId: bigint,
    @Args("stars", {
      type: () => Int,
    })
    stars: number,
    @Args("body", {
      type: () => String,
      nullable: true,
    })
    body?: string | null,
  ): Promise<boolean> {
    const dto = rateArgs.transform({
      stars,
      body: body ?? undefined,
    });
    await this.commands.execute(
      new RateProductCommand(user.id, productId, dto.stars, dto.body),
    );
    return true;
  }

  @Mutation(() => Boolean, {
    description: "Remove your rating of a product",
  })
  async removeMyRating(
    @CurrentUser() user: AuthUser,
    @Args("productId", idArg, IdPipe) productId: bigint,
  ): Promise<boolean> {
    await this.commands.execute(
      new DeleteRatingCommand(
        {
          productId,
        },
        user,
      ),
    );
    return true;
  }

  @RequirePermission("rating:delete:any")
  @Mutation(() => Boolean, {
    description: "Remove any rating (admin)",
  })
  async deleteRating(
    @CurrentUser() user: AuthUser,
    @Args("id", idArg, IdPipe) id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(
      new DeleteRatingCommand(
        {
          ratingId: id,
        },
        user,
      ),
    );
    return true;
  }
}
