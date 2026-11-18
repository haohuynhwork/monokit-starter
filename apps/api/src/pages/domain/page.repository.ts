import type { Page } from "./page.js";

// Each write is one transaction keeping parentId, fullSlug and the closure
// table consistent. A path used by another live page throws PathTakenError.
export interface PageRepository {
  // Non-deleted only
  findById(id: bigint): Promise<Page | null>;
  // Inserts (assigning the id) or updates; recomputes the path of the page
  // and everything below it when slug or parent changed
  save(page: Page): Promise<void>;
  // fullSlug of a page (null: the root has the empty path ''); null when it
  // has none yet
  pathOf(pageId: bigint | null): Promise<string | null>;
  isInSubtree(rootId: bigint, nodeId: bigint): Promise<boolean>;
  hasLiveChildren(pageId: bigint): Promise<boolean>;
}

export const PAGE_REPOSITORY = Symbol("PAGE_REPOSITORY");
