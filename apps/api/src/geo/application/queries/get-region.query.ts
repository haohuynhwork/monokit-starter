import { Query } from "@nestjs/cqrs";
import type { RegionView } from "./region.view.js";

export class GetRegionQuery extends Query<RegionView | null> {
  constructor(readonly regionId: bigint) {
    super();
  }
}
