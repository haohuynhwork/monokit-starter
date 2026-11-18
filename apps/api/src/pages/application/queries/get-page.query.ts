import { Query } from "@nestjs/cqrs";
import type { PageView } from "./page.view.js";

// One non-deleted page for the panel, drafts included
export class GetPageQuery extends Query<PageView | null> {
  constructor(readonly pageId: bigint) {
    super();
  }
}
