import { Query } from "@nestjs/cqrs";
import type { RegionView } from "./region.view.js";

// A country's regions by position then name. parentId: undefined for all
// levels (flat), null for the top level only. activeOnly for the picker.
export class ListRegionsQuery extends Query<RegionView[]> {
  constructor(
    readonly filter: {
      countryCode: string;
      parentId?: bigint | null;
      activeOnly: boolean;
    },
  ) {
    super();
  }
}
