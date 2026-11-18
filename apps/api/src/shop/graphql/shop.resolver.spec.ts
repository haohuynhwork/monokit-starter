import { GetProductQuery } from "../application/queries/get-product.query.js";
import { ListProductsQuery } from "../application/queries/list-products.query.js";
import { PriceCartQuery } from "../application/queries/price-cart.query.js";
import { catalogApp, product } from "./catalog.testing.js";
import { ShopResolver } from "./shop.resolver.js";

describe("ShopResolver", () => {
  let t: Awaited<ReturnType<typeof catalogApp>>;
  beforeEach(async () => {
    t = await catalogApp(ShopResolver);
  });
  afterEach(() => t.app.close());

  it("lists active products without sign-in, public fields only", async () => {
    t.queries.mockResolvedValue({
      items: [
        product,
      ],
      total: 1,
    });
    const res = await t.gql(
      '{ shopProducts(q: "tee", limit: 5) { items { slug sale { startsAt } variants { sale stock } } meta { total limit offset } } }',
    );
    expect(res.body).toEqual({
      data: {
        shopProducts: {
          items: [
            {
              slug: "tee",
              sale: null,
              variants: [
                {
                  sale: null,
                  stock: null,
                },
              ],
            },
          ],
          meta: {
            total: 1,
            limit: 5,
            offset: 0,
          },
        },
      },
    });
    expect(t.queries).toHaveBeenCalledWith(
      new ListProductsQuery(
        {
          q: "tee",
          status: "active",
        },
        "newest",
        5,
        0,
      ),
    );
  });

  it("reports a missing product as not found", async () => {
    t.queries.mockResolvedValue(null);
    const res = await t.gql('{ shopProduct(slug: "nope") { id } }');
    expect(res.body.errors[0].extensions.status).toBe(404);
    expect(t.queries).toHaveBeenCalledWith(
      new GetProductQuery(
        {
          slug: "nope",
        },
        true,
      ),
    );
  });

  it("prices a guest cart, merging repeated variants", async () => {
    t.queries.mockResolvedValue({
      items: [],
      count: 0,
      subtotal: "0",
    });
    const res = await t.gql(
      '{ priceCart(items: [{ variantId: "2", quantity: 1 }, { variantId: "2", quantity: 2 }]) { count subtotal } }',
    );
    expect(res.body.data.priceCart).toEqual({
      count: 0,
      subtotal: "0",
    });
    expect(t.queries).toHaveBeenCalledWith(
      new PriceCartQuery([
        {
          variantId: 2n,
          quantity: 3,
        },
      ]),
    );
  });

  it("rejects an invalid product id", async () => {
    const res = await t.gql(
      '{ productRatings(productId: "x") { meta { total } } }',
    );
    expect(res.body.errors[0].extensions.status).toBe(400);
    expect(t.queries).not.toHaveBeenCalled();
  });
});
