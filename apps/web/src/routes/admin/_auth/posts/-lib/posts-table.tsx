import { Button } from "@packages/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@packages/ui/components/table";
import { Link, useRouter } from "@tanstack/react-router";
import { Send, Trash2, Undo2 } from "lucide-react";
import { useState, useTransition } from "react";
import { EmptyRow, type EmptyText } from "@/components/empty-row";
import { notify } from "@/components/toast";
import type { PostSummary } from "@/lib/types";
import {
  type PostState,
  publishPost,
  removePost,
  unpublishPost,
} from "./actions";
import { StatusBadge } from "./post-editor";

const BULK = {
  publish: {
    label: "Publish",
    done: "Published",
    run: (id: string) => publishPost(id),
  },
  unpublish: {
    label: "Unpublish",
    done: "Unpublished",
    run: unpublishPost,
  },
  delete: {
    label: "Delete",
    done: "Deleted",
    run: removePost,
  },
} satisfies Record<
  string,
  {
    label: string;
    done: string;
    run: (id: string) => Promise<PostState>;
  }
>;

export function PostsTable({
  posts,
  canPublish,
  empty,
}: {
  posts: PostSummary[];
  canPublish: boolean;
  // Shown in the table when there are no posts
  empty: EmptyText;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const allSelected =
    posts.length > 0 && posts.every((p) => selected.has(p.id));
  const chosen = posts.filter((p) => selected.has(p.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  // One by one, so one refusal doesn't stop the rest
  function run(kind: keyof typeof BULK) {
    const n = chosen.length;
    const { label, done } = BULK[kind];
    const noun = `post${n > 1 ? "s" : ""}`;
    if (!confirm(`${label} ${n} ${noun}?`)) {
      return;
    }
    startTransition(async () => {
      const failed: string[] = [];
      for (const p of chosen) {
        const res = await BULK[kind].run(p.id);
        if (!res.ok) {
          failed.push(`${p.title}: ${res.message ?? "failed"}`);
        }
      }
      if (failed.length) {
        notify(`${label}: ${n - failed.length} of ${n} done`, {
          kind: "error",
          description: failed.join("; "),
        });
      } else {
        notify(`${done} ${n} ${noun}`, {
          kind: "success",
        });
      }
      setSelected(new Set());
      // Re-runs the route loader
      await router.invalidate();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        <span
          className={selected.size ? "font-medium" : "text-muted-foreground"}
        >
          {selected.size ? `${selected.size} selected` : "No rows selected"}
        </span>
        {canPublish && (
          <>
            <Button
              variant="outline"
              size="xs"
              className="ml-auto"
              disabled={pending || selected.size === 0}
              onClick={() => run("publish")}
            >
              <Send /> Publish
            </Button>
            <Button
              variant="outline"
              size="xs"
              disabled={pending || selected.size === 0}
              onClick={() => run("unpublish")}
            >
              <Undo2 /> Unpublish
            </Button>
          </>
        )}
        <Button
          variant="destructive"
          size="xs"
          className={canPublish ? undefined : "ml-auto"}
          disabled={pending || selected.size === 0}
          onClick={() => run("delete")}
        >
          <Trash2 /> {pending ? "Working…" : "Delete"}
        </Button>
        <Button
          variant="ghost"
          size="xs"
          disabled={pending || selected.size === 0}
          onClick={() => setSelected(new Set())}
        >
          Clear
        </Button>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allSelected}
                  disabled={posts.length === 0}
                  onChange={() =>
                    setSelected(
                      allSelected ? new Set() : new Set(posts.map((p) => p.id)),
                    )
                  }
                  className="size-4 accent-primary"
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.length === 0 && <EmptyRow {...empty} colSpan={5} />}
            {posts.map((post) => (
              <TableRow
                key={post.id}
                data-state={selected.has(post.id) ? "selected" : undefined}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`Select ${post.title}`}
                    checked={selected.has(post.id)}
                    onChange={() => toggle(post.id)}
                    className="size-4 accent-primary"
                  />
                </TableCell>
                <TableCell className="max-w-72">
                  <Link
                    to="/admin/posts/$id"
                    params={{
                      id: post.id,
                    }}
                    className="block truncate font-medium hover:underline"
                  >
                    {post.title}
                  </Link>
                </TableCell>
                <TableCell className="max-w-60 truncate text-muted-foreground">
                  {post.path ? `/${post.path}` : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge post={post} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(post.updatedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
