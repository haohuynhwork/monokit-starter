import { DeleteRatingCommand } from "../application/commands/delete-rating.command.js";
import { RateProductCommand } from "../application/commands/rate-product.command.js";
import { actorFor, catalogApp } from "./catalog.testing.js";
import { RatingsResolver } from "./ratings.resolver.js";
import { ShopResolver } from "./shop.resolver.js";

describe("RatingsResolver", () => {
  let t: Awaited<ReturnType<typeof catalogApp>>;
  beforeEach(async () => {
    t = await catalogApp(RatingsResolver, ShopResolver);
  });
  afterEach(() => t.app.close());

  it("rates a product as the signed-in user", async () => {
    const res = await t.gql(
      'mutation { rateProduct(productId: "1", stars: 5) }',
      undefined,
      "author",
    );
    expect(res.body).toEqual({
      data: {
        rateProduct: true,
      },
    });
    expect(t.commands).toHaveBeenCalledWith(
      new RateProductCommand(7n, 1n, 5, null),
    );
  });

  it("validates stars", async () => {
    const res = await t.gql(
      'mutation { rateProduct(productId: "1", stars: 6) }',
      undefined,
      "author",
    );
    expect(res.body.errors[0].extensions.code).toBe("validation_failed");
  });

  it("lets only admins remove any rating", async () => {
    const denied = await t.gql(
      'mutation { deleteRating(id: "4") }',
      undefined,
      "editor",
    );
    expect(denied.body.errors[0].extensions.status).toBe(403);
    await t.gql('mutation { deleteRating(id: "4") }', undefined, "admin");
    expect(t.commands).toHaveBeenCalledWith(
      new DeleteRatingCommand(
        {
          ratingId: 4n,
        },
        actorFor("admin"),
      ),
    );
  });
});
