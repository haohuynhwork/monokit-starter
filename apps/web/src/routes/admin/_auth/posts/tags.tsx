import { createFileRoute } from "@tanstack/react-router";
import { Empty } from "@/components/pager";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import type { PostTag } from "@/lib/types";
import { TagList } from "@/routes/admin/_auth/posts/-lib/tag-list";

// Tags are created by tagging a post (the post editor); here editors and
// admins rename or delete them. Authors see the list only.
export const Route = createFileRoute("/admin/_auth/posts/tags")({
  loader: async () => {
    const res = await api<PostTag[]>("/posts/tags");
    return res.status === "success"
      ? {
          error: null,
          tags: res.data ?? [],
        }
      : {
          error: res.message ?? "Could not load tags.",
          tags: [],
        };
  },
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: PostTagsPage,
});

function PostTagsPage() {
  const { error, tags } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Post tags</h1>
      {error ? (
        <Empty>{error}</Empty>
      ) : (
        <TagList tags={tags} canManage={isStaff(user)} />
      )}
    </div>
  );
}
