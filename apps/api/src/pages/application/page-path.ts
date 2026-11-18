import type { QueryBus } from "@nestjs/cqrs";
import { joinPath, PathTakenError } from "../../common/domain/paths.js";
import { IsPostPathTakenQuery } from "../../posts/application/queries/is-post-path-taken.query.js";
import type { Page } from "../domain/page.js";
import type { PageRepository } from "../domain/page.repository.js";

// Pages and posts share the site's URLs: refuse a page path a live post
// already has. Paths of pages below it are not checked (a clash there is
// accepted; the page wins at lookup, ideas/pages).
export async function checkPathFree(
  page: Page,
  pages: PageRepository,
  queries: QueryBus,
): Promise<void> {
  const path = joinPath(
    await pages.pathOf(page.parentId),
    page.slug,
    page.parentId === null,
  );
  if (path && (await queries.execute(new IsPostPathTakenQuery(path)))) {
    throw new PathTakenError("post");
  }
}
