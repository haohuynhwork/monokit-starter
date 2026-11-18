import { Query } from "@nestjs/cqrs";
import type { CategoryView } from "./shop.view.js";

// All live categories, flat, by position then name; clients build the tree
export class ListCategoriesQuery extends Query<CategoryView[]> {}
