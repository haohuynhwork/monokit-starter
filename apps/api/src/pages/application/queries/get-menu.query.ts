import { Query } from "@nestjs/cqrs";
import type { MenuItem } from "./page.view.js";

// Live pages marked showInMenu, nested under their nearest menu ancestor,
// ordered by menuOrder
export class GetMenuQuery extends Query<MenuItem[]> {}
