import { Query } from "@nestjs/cqrs";
import type { CurrenciesView } from "./locale.view.js";

// By position then code; activeOnly for public switchers
export class ListCurrenciesQuery extends Query<CurrenciesView> {
  constructor(readonly activeOnly: boolean) {
    super();
  }
}
