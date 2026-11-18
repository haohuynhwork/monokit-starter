import { Query } from "@nestjs/cqrs";
import type { PublicPageView } from "./page.view.js";

// A live page by its full path, layout resolved; null when none
export class GetPublicPageQuery extends Query<PublicPageView | null> {
  constructor(readonly path: string) {
    super();
  }
}
