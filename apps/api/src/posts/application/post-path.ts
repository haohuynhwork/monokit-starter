import type { QueryBus } from "@nestjs/cqrs";
import {
  checkNotReserved,
  joinPath,
  PathTakenError,
  ReservedPathError,
} from "../../common/domain/paths.js";
import { ListLocalesQuery } from "../../geo/application/queries/list-locales.query.js";
import { IsPagePathTakenQuery } from "../../pages/application/queries/is-page-path-taken.query.js";
import type { Post } from "../domain/post.js";
import type { PostRepository } from "../domain/post.repository.js";

// Posts share the site's URLs with pages and the app's own routes
// (ideas/pages "One URL namespace"): refuse a reserved first segment, a
// locale prefix (ideas/i18n) and a path a page already has. With `localeId`,
// the post's path in that locale is checked. Paths below the post are not.
export async function checkPathFree(
  post: Post,
  posts: PostRepository,
  queries: QueryBus,
  localeId?: bigint,
): Promise<void> {
  const translation = localeId ? post.translation(localeId) : null;
  const path = joinPath(
    localeId
      ? await posts.pathIn(post.parentId, localeId)
      : await posts.pathOf(post.parentId),
    translation?.slug ?? post.slug,
    post.parentId === null,
  );
  checkNotReserved(path);
  await checkNotLocalePrefix(path, queries);
  if (
    path &&
    (await queries.execute(new IsPagePathTakenQuery(path, localeId)))
  ) {
    throw new PathTakenError("page");
  }
}

// '/vi-vn/...' is the Vietnamese site, so no item may start with it
export async function checkNotLocalePrefix(
  path: string | null,
  queries: QueryBus,
): Promise<void> {
  const first = path?.split("/")[0]?.toLowerCase();
  if (!first) {
    return;
  }
  const locales = await queries.execute(new ListLocalesQuery(false));
  if (locales.some((l) => l.code.toLowerCase() === first)) {
    throw new ReservedPathError(first);
  }
}
