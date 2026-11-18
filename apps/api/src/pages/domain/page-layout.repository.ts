import type { PageLayout } from "./page-layout.js";

export interface PageLayoutRepository {
  // Non-deleted only
  findById(id: bigint): Promise<PageLayout | null>;
  findDefault(): Promise<PageLayout | null>;
  // Saving a default layout unsets the previous default in the same
  // transaction. A name used by another live layout throws
  // PageLayoutNameTakenError.
  save(layout: PageLayout): Promise<void>;
  // Used by any non-deleted page?
  isUsed(layoutId: bigint): Promise<boolean>;
}

export const PAGE_LAYOUT_REPOSITORY = Symbol("PAGE_LAYOUT_REPOSITORY");
