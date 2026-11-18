import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import type { FormEvent } from "react";
import { emptyText } from "@/components/empty-row";
import { Pager } from "@/components/pager";
import { api } from "@/lib/api";
import { oneOf, pageParam, textParam, toQuery } from "@/lib/search";
import type { PostSummary } from "@/lib/types";
import { NewPost } from "@/routes/admin/_auth/posts/-lib/new-post";
import { PostsTable } from "@/routes/admin/_auth/posts/-lib/posts-table";

const PAGE_SIZE = 20;
const STATUSES = [
  "draft",
  "scheduled",
  "published",
] as const;

export const Route = createFileRoute("/admin/_auth/posts/")({
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    q?: string;
    status?: (typeof STATUSES)[number];
    tag?: string;
    page?: number;
  } => ({
    q: textParam(s.q),
    status: oneOf(s.status, STATUSES),
    // A tag slug (from Post tags)
    tag: textParam(s.tag),
    page: pageParam(s.page),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const page = deps.page ?? 1;
    const res = await api<PostSummary[]>(
      `/posts${toQuery({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        q: deps.q,
        status: deps.status,
        tag: deps.tag,
      })}`,
    );
    const posts = res.status === "success" && res.data ? res.data : [];
    return {
      error:
        res.status === "success"
          ? null
          : (res.message ?? "Could not load posts."),
      posts,
      total:
        (
          res as {
            meta?: {
              total: number;
            };
          }
        ).meta?.total ?? posts.length,
    };
  },
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: PostsPage,
});

function PostsPage() {
  const { error, posts, total } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const { q, status, tag, page = 1 } = Route.useSearch();
  const navigate = useNavigate({
    from: Route.fullPath,
  });

  // The URL holds the filters; a new filter starts at page 1
  const filter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    navigate({
      search: {
        q: textParam(data.get("q")),
        status: oneOf(data.get("status"), STATUSES),
        tag,
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
        <NewPost />
      </div>
      <form
        // Fresh inputs when the URL changes (e.g. back, a tag link)
        key={`${q}:${status}`}
        noValidate
        onSubmit={filter}
        className="flex flex-wrap gap-2"
      >
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title and text"
          className="h-8 min-w-60 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
        >
          <option value="">All</option>
          <option value="draft">Drafts</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </select>
        <button
          type="submit"
          className="h-8 rounded-lg border px-3 text-sm hover:bg-muted"
        >
          Filter
        </button>
        {tag && (
          <Link
            from={Route.fullPath}
            search={{
              q,
              status,
            }}
            className="flex h-8 items-center gap-1 rounded-full border px-3 text-sm hover:bg-muted"
            aria-label={`Remove tag filter ${tag}`}
          >
            Tag: {tag} <X className="size-3.5" />
          </Link>
        )}
      </form>
      {error ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {error}
        </p>
      ) : (
        <PostsTable
          key={`${page}:${q}:${status}:${tag}`}
          posts={posts}
          canPublish={user.role !== "author"}
          empty={emptyText(
            "posts",
            !!(q || status || tag),
            "Write the first one with “New post”.",
          )}
        />
      )}
      <Pager page={page} pageSize={PAGE_SIZE} total={total} />
    </div>
  );
}
