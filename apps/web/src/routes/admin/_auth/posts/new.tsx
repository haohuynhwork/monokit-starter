import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import type { PostOption } from "@/lib/types";
import {
  NEW_POST,
  PostEditor,
} from "@/routes/admin/_auth/posts/-lib/post-editor";

// A blank editor; savePost creates the post on the first save
export const Route = createFileRoute("/admin/_auth/posts/new")({
  loader: async () => {
    const options = await api<PostOption[]>("/posts/options");
    return {
      options: options.status === "success" && options.data ? options.data : [],
    };
  },
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: NewPostPage,
});

function NewPostPage() {
  const { options } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/admin/posts"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Posts
      </Link>
      <PostEditor
        post={NEW_POST}
        options={options}
        canPublish={user.role !== "author"}
      />
    </div>
  );
}
