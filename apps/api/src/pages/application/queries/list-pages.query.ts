import { Query } from "@nestjs/cqrs";
import type { PageSummary } from "./page.view.js";

// Every non-deleted page (a site has tens, not thousands), parents before
// children by menu order then title
export class ListPagesQuery extends Query<PageSummary[]> {}
