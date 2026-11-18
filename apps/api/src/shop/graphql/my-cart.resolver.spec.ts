import type { INestApplication } from "@nestjs/common";
import { AddToCartCommand } from "../application/commands/add-to-cart.command.js";
import { MergeCartCommand } from "../application/commands/merge-cart.command.js";
import { GetCartQuery } from "../application/queries/get-cart.query.js";
import type { CartView } from "../application/queries/shop.view.js";
import { accountApp } from "./account.testing.js";
import { MyCartResolver } from "./my-cart.resolver.js";

const cart: CartView = {
  items: [],
  count: 0,
  subtotal: "0",
};

describe("MyCartResolver", () => {
  let app: INestApplication;
  let gql: Awaited<ReturnType<typeof accountApp>>["gql"];
  const commands = vi.fn();
  const queries = vi.fn();

  beforeEach(async () => {
    commands.mockReset();
    queries.mockReset().mockResolvedValue(cart);
    ({ app, gql } = await accountApp(MyCartResolver, commands, queries));
  });

  afterEach(() => app.close());

  it("reads my cart", async () => {
    const res = await gql("{ myCart { count subtotal items { variantId } } }");
    expect(res.body).toEqual({
      data: {
        myCart: {
          count: 0,
          subtotal: "0",
          items: [],
        },
      },
    });
    expect(queries).toHaveBeenCalledWith(new GetCartQuery(7n));
  });

  it("adds a variant, defaulting the quantity", async () => {
    const res = await gql('mutation { addToMyCart(variantId: "5") { count } }');
    expect(res.body.data.addToMyCart.count).toBe(0);
    expect(commands).toHaveBeenCalledWith(new AddToCartCommand(7n, 5n, 1));
  });

  it("merges a guest cart, adding repeated lines", async () => {
    await gql(
      'mutation { mergeMyCart(items: [{ variantId: "5", quantity: 2 }, { variantId: "5", quantity: 3 }]) { count } }',
    );
    expect(commands).toHaveBeenCalledWith(
      new MergeCartCommand(7n, [
        {
          variantId: 5n,
          quantity: 5,
        },
      ]),
    );
  });

  it("rejects a bad quantity and a missing sign-in", async () => {
    const bad = await gql(
      'mutation { setMyCartQuantity(variantId: "5", quantity: 0) { count } }',
    );
    expect(bad.body.errors[0].extensions).toMatchObject({
      code: "validation_failed",
      status: 400,
    });
    const anon = await gql("{ myCart { count } }", undefined, false);
    expect(anon.body.errors[0].extensions.status).toBe(401);
    expect(commands).not.toHaveBeenCalled();
  });
});
