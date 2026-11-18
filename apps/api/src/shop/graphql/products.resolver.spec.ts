import { CreateProductCommand } from "../application/commands/create-product.command.js";
import { DeleteProductCommand } from "../application/commands/delete-product.command.js";
import { actorFor, catalogApp, product } from "./catalog.testing.js";
import { ProductsResolver } from "./products.resolver.js";

describe("ProductsResolver", () => {
  let t: Awaited<ReturnType<typeof catalogApp>>;
  beforeEach(async () => {
    t = await catalogApp(ProductsResolver);
  });
  afterEach(() => t.app.close());

  it("shows staff the sale as set", async () => {
    t.queries.mockResolvedValue(product);
    const res = await t.gql(
      '{ product(id: "1") { sale { startsAt } variants { sale } } }',
      undefined,
      "editor",
    );
    expect(res.body.data.product).toEqual({
      sale: {
        startsAt: "2030-01-01T00:00:00Z",
      },
      variants: [
        {
          sale: "500",
        },
      ],
    });
  });

  it("creates a product through the command bus", async () => {
    t.commands.mockResolvedValue(1n);
    t.queries.mockResolvedValue(product);
    const res = await t.gql(
      'mutation { createProduct(input: { name: "Tee", slug: "tee", variants: [{ listPrice: "1000", values: {} }] }) { id } }',
      undefined,
      "admin",
    );
    expect(res.body).toEqual({
      data: {
        createProduct: {
          id: "1",
        },
      },
    });
    expect(t.commands).toHaveBeenCalledWith(
      new CreateProductCommand(
        {
          name: "Tee",
          slug: "tee",
          variants: [
            {
              listPrice: 1000n,
              values: {},
            },
          ],
        },
        actorFor("admin"),
      ),
    );
  });

  it("validates the input with the REST schema", async () => {
    const res = await t.gql(
      'mutation { createProduct(input: { name: "Tee" }) { id } }',
      undefined,
      "admin",
    );
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "validation_failed",
      status: 400,
    });
    expect(t.commands).not.toHaveBeenCalled();
  });

  it("deletes, staff only", async () => {
    const denied = await t.gql(
      'mutation { deleteProduct(id: "1") }',
      undefined,
      "author",
    );
    expect(denied.body.errors[0].extensions.status).toBe(403);
    const res = await t.gql(
      'mutation { deleteProduct(id: "1") }',
      undefined,
      "editor",
    );
    expect(res.body.data.deleteProduct).toBe(true);
    expect(t.commands).toHaveBeenCalledWith(
      new DeleteProductCommand(1n, actorFor("editor")),
    );
  });
});
