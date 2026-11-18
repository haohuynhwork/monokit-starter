import type { INestApplication } from "@nestjs/common";
import { AddToWishlistCommand } from "../application/commands/add-to-wishlist.command.js";
import { MergeWishlistCommand } from "../application/commands/merge-wishlist.command.js";
import { ListWishlistIdsQuery } from "../application/queries/list-wishlist-ids.query.js";
import { accountApp } from "./account.testing.js";
import { MyWishlistResolver } from "./my-wishlist.resolver.js";

describe("MyWishlistResolver", () => {
  let app: INestApplication;
  let gql: Awaited<ReturnType<typeof accountApp>>["gql"];
  const commands = vi.fn();
  const queries = vi.fn();

  beforeEach(async () => {
    commands.mockReset();
    queries.mockReset();
    ({ app, gql } = await accountApp(MyWishlistResolver, commands, queries));
  });

  afterEach(() => app.close());

  it("lists my saved product ids", async () => {
    queries.mockResolvedValue([
      "3",
    ]);
    const res = await gql("{ myWishlistIds }");
    expect(res.body).toEqual({
      data: {
        myWishlistIds: [
          "3",
        ],
      },
    });
    expect(queries).toHaveBeenCalledWith(new ListWishlistIdsQuery(7n));
  });

  it("saves a product and answers true", async () => {
    const res = await gql('mutation { addToMyWishlist(productId: "3") }');
    expect(res.body).toEqual({
      data: {
        addToMyWishlist: true,
      },
    });
    expect(commands).toHaveBeenCalledWith(new AddToWishlistCommand(7n, 3n));
  });

  it("merges a guest list", async () => {
    await gql('mutation { mergeMyWishlist(productIds: ["3", "4"]) }');
    expect(commands).toHaveBeenCalledWith(
      new MergeWishlistCommand(7n, [
        3n,
        4n,
      ]),
    );
  });

  it("rejects a bad id and a missing sign-in", async () => {
    const bad = await gql('mutation { addToMyWishlist(productId: "x") }');
    expect(bad.body.errors[0].extensions.status).toBe(400);
    const anon = await gql("{ myWishlistIds }", undefined, false);
    expect(anon.body.errors[0].extensions.status).toBe(401);
    expect(commands).not.toHaveBeenCalled();
  });
});
