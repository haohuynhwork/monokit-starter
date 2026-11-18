import { ChangeOrderStatusCommand } from "../application/commands/change-order-status.command.js";
import { ListOrdersQuery } from "../application/queries/list-orders.query.js";
import { actorFor, catalogApp } from "./catalog.testing.js";
import { OrdersResolver } from "./orders.resolver.js";

const order = {
  id: "9",
  userId: null,
  status: "shipped",
  paymentMethod: "cod",
  paymentStatus: "unpaid",
  currency: "VND",
  total: "1000",
  subtotal: "1000",
  shippingFee: "0",
  tax: "0",
  shippingAddress: {
    label: null,
    recipientName: "An",
    phone: "1",
    line1: "x",
    line2: null,
    city: "Hanoi",
    regionCode: null,
    region: null,
    postalCode: null,
    countryCode: "VN",
  },
  billingAddress: null,
  trackingNumber: "T1",
  paidAt: null,
  note: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  items: [],
  events: [
    {
      type: "status",
      data: {
        to: "shipped",
      },
      actorId: "7",
      createdAt: "2026-01-01T00:00:00Z",
    },
  ],
};

describe("OrdersResolver", () => {
  let t: Awaited<ReturnType<typeof catalogApp>>;
  beforeEach(async () => {
    t = await catalogApp(OrdersResolver);
  });
  afterEach(() => t.app.close());

  it("lists orders, paginated", async () => {
    t.queries.mockResolvedValue({
      items: [],
      total: 0,
    });
    const res = await t.gql(
      '{ orders(status: "pending") { meta { total limit } } }',
      undefined,
      "editor",
    );
    expect(res.body.data.orders.meta).toEqual({
      total: 0,
      limit: 20,
    });
    expect(t.queries).toHaveBeenCalledWith(
      new ListOrdersQuery(
        {
          status: "pending",
        },
        20,
        0,
      ),
    );
  });

  it("ships an order", async () => {
    t.queries.mockResolvedValue(order);
    const res = await t.gql(
      'mutation { changeOrderStatus(id: "9", status: "shipped", trackingNumber: "T1") { trackingNumber events { data } } }',
      undefined,
      "admin",
    );
    expect(res.body.data.changeOrderStatus).toEqual({
      trackingNumber: "T1",
      events: [
        {
          data: {
            to: "shipped",
          },
        },
      ],
    });
    expect(t.commands).toHaveBeenCalledWith(
      new ChangeOrderStatusCommand(9n, "shipped", "T1", actorFor("admin")),
    );
  });

  it("rejects an unknown status", async () => {
    const res = await t.gql(
      'mutation { changeOrderStatus(id: "9", status: "lost") { id } }',
      undefined,
      "admin",
    );
    expect(res.body.errors[0].extensions.code).toBe("validation_failed");
    expect(t.commands).not.toHaveBeenCalled();
  });
});
