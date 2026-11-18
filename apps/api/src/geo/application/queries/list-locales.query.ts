import { Query } from "@nestjs/cqrs";
import type { LocaleView } from "./locale.view.js";

// Default first, then by position and name; activeOnly for public switchers
export class ListLocalesQuery extends Query<LocaleView[]> {
  constructor(readonly activeOnly: boolean) {
    super();
  }
}
