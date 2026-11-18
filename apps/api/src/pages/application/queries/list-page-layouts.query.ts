import { Query } from "@nestjs/cqrs";
import type { PageLayoutView } from "./page.view.js";

// Every non-deleted layout, default first, then by name
export class ListPageLayoutsQuery extends Query<PageLayoutView[]> {}
