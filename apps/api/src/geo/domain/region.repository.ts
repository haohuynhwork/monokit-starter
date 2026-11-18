import type { Region } from "./region.js";

// Regions are hard-deleted (only while unused); code clashes throw
// RegionCodeTakenError
export interface RegionRepository {
  findById(id: bigint): Promise<Region | null>;
  // The region and its ancestors, nearest first
  ancestorIds(id: bigint): Promise<bigint[]>;
  // Used by an address (deleted ones too: orders may copy them later) or a
  // subregion
  isInUse(region: Region): Promise<boolean>;
  hasCountry(countryCode: string): Promise<boolean>;
  save(region: Region): Promise<void>;
  // New top-level regions in one statement
  insertMany(regions: Region[]): Promise<void>;
  delete(id: bigint): Promise<void>;
}
export const REGION_REPOSITORY = Symbol("REGION_REPOSITORY");
