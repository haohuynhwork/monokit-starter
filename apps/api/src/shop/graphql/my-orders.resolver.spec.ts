import type { INestApplication } from "@nestjs/common";
import { PlaceOrderCommand } from "../application/commands/place-order.command.js";
import { ListOrdersQuery } from "../application/queries/list-orders.query.js";
import { accountApp } from "./account.testing.js";
import { MyOrdersResolver } from "./my-orders.resolver.js";

describe("MyOrdersResolver", () => {
  let app: INestApplication;
  let gql: Awaited<ReturnType<typeof accountApp>>["gql"];
  const commands = vi.fn();
  const queries = vi.fn();

  beforeEach(async () => {
    commands.mockReset();
    queries.mockReset();
    ({ app, gql } = await accountApp(MyOrdersResolver, commands, queries));
  });

  afterEach(() => app.close());

  it("pages my orders", async () => {
    queries.mockResolvedValue({
      items: [],
      total: 0,
    });
    const res = await gql(
      '{ myOrders(status: "pending", limit: 5) { items { id } meta { total limit offset } } }',
    );
    expect(res.body).toEqual({
      data: {
        myOrders: {
          items: [],
          meta: {
            total: 0,
            limit: 5,
            offset: 0,
          },
        },
      },
    });
    expect(queries).toHaveBeenCalledWith(
      new ListOrdersQuery(
        {
          userId: 7n,
          status: "pending",
        },
        5,
        0,
      ),
    );
  });

  it("places an order, reporting a missing one as not found", async () => {
    commands.mockResolvedValue(11n);
    queries.mockResolvedValue(null);
    const res = await gql(
      'mutation { placeOrder(input: { items: [{ variantId: "5", quantity: 2 }], addressId: "9", paymentMethod: "cod" }) { id } }',
    );
    expect(commands).toHaveBeenCalledWith(
      new PlaceOrderCommand(
        7n,
        [
          {
            variantId: 5n,
            quantity: 2,
          },
        ],
        9n,
        "cod",
        null,
        null,
      ),
    );
    expect(res.body.errors[0].extensions.status).toBe(404);
  });

  it("validates the input and needs a sign-in", async () => {
    const bad = await gql(
      'mutation { placeOrder(input: { items: [], addressId: "9", paymentMethod: "cod" }) { id } }',
    );
    expect(bad.body.errors[0].extensions.code).toBe("validation_failed");
    const anon = await gql('{ myOrder(id: "1") { id } }', undefined, false);
    expect(anon.body.errors[0].extensions.status).toBe(401);
    expect(commands).not.toHaveBeenCalled();
  });
});
