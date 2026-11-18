import { UpdateCategoryCommand } from "../application/commands/update-category.command.js";
import { actorFor, catalogApp } from "./catalog.testing.js";
import { CategoriesResolver } from "./categories.resolver.js";

const category = {
  id: "3",
  parentId: null,
  name: "Shirts",
  slug: "shirts",
  position: 0,
};

describe("CategoriesResolver", () => {
  let t: Awaited<ReturnType<typeof catalogApp>>;
  beforeEach(async () => {
    t = await catalogApp(CategoriesResolver);
  });
  afterEach(() => t.app.close());

  it("needs a sign-in", async () => {
    const res = await t.gql("{ categories { id } }");
    expect(res.body.errors[0].extensions.status).toBe(401);
  });

  it("lists categories for staff", async () => {
    t.queries.mockResolvedValue([
      category,
    ]);
    const res = await t.gql("{ categories { id slug } }", undefined, "editor");
    expect(res.body.data.categories).toEqual([
      {
        id: "3",
        slug: "shirts",
      },
    ]);
  });

  it("moves a category", async () => {
    t.queries.mockResolvedValue([
      category,
    ]);
    const res = await t.gql(
      'mutation { updateCategory(id: "3", input: { parentId: null, position: 2 }) { id } }',
      undefined,
      "admin",
    );
    expect(res.body.data.updateCategory.id).toBe("3");
    expect(t.commands).toHaveBeenCalledWith(
      new UpdateCategoryCommand(
        3n,
        {
          parentId: null,
          position: 2,
        },
        actorFor("admin"),
      ),
    );
  });
});
