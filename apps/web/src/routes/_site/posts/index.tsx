import { Button } from "@packages/ui/components/button";
import { Input } from "@packages/ui/components/input";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { Pager } from "@/components/pager";
import { pageParam, textParam } from "@/lib/search";
import { getPostsPage, getPostTags } from "@/lib/site/public-api";
import { PostList } from "../-lib/post-article";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/_site/posts/")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: textParam(s.q),
    tag: textParam(s.tag),
    page: pageParam(s.page),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [result, tags] = await Promise.all([
      getPostsPage({
        data: {
          page: deps.page ?? 1,
          pageSize: PAGE_SIZE,
          q: deps.q,
          tag: deps.tag,
        },
      }),
      getPostTags(),
    ]);
    return {
      result,
      tags,
    };
  },
  head: () => ({
    meta: [
      {
        title: "Posts",
      },
    ],
  }),
  component: PostsPage,
});

// The search box, tag filter and pager stay visible when nothing matches,
// so a filter can always be changed or cleared
function PostsPage() {
  const { result, tags } = Route.useLoaderData();
  const { q, tag, page = 1 } = Route.useSearch();
  const navigate = useNavigate({
    from: Route.fullPath,
  });
  const posts = result?.posts ?? [];

  function filter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    navigate({
      search: {
        q: textParam(form.get("q")),
        tag: textParam(form.get("tag")),
        page: undefined,
      },
    });
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Posts</h1>
      <div className="flex flex-col gap-4">
        <search>
          <form noValidate onSubmit={filter} className="flex flex-wrap gap-2">
            <Input
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder="Search posts"
              aria-label="Search posts"
              maxLength={200}
              className="min-w-48 flex-1"
            />
            <select
              name="tag"
              defaultValue={tag ?? ""}
              aria-label="Tag"
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name} ({t.postCount})
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>
        </search>
        {posts.length > 0 ? (
          <PostList posts={posts} />
        ) : (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {!result
              ? "Could not load posts."
              : q || tag
                ? "No posts match. Try other words or another tag."
                : "Nothing published yet."}
          </p>
        )}
        <Pager page={page} pageSize={PAGE_SIZE} total={result?.total ?? 0} />
      </div>
    </main>
  );
}
