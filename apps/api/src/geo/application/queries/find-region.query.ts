import { Query } from "@nestjs/cqrs";

export interface RegionLookup {
  countryCode: string;
  name: string;
  active: boolean;
}

// By code (upper-case), inactive included; null when unknown
export class FindRegionQuery extends Query<RegionLookup | null> {
  constructor(readonly code: string) {
    super();
  }
}
