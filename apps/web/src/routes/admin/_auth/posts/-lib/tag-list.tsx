import { Button } from "@packages/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@packages/ui/components/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@packages/ui/components/field";
import { Input } from "@packages/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@packages/ui/components/table";
import { Link, useRouter } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";
import { EmptyRow } from "@/components/empty-row";
import { notify } from "@/components/toast";
import type { PostTag } from "@/lib/types";
import { deletePostTag, type PostState, renamePostTag } from "./actions";

export function TagList({
  tags,
  canManage,
}: {
  tags: PostTag[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<PostTag>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const remove = (t: PostTag) => {
    const used = t.postCount === 1 ? "1 post" : `${t.postCount} posts`;
    if (!confirm(`Delete “${t.name}”? It is removed from ${used}.`)) {
      return;
    }
    startTransition(async () => {
      const res = await deletePostTag(t.id);
      notify(res.ok ? "Tag deleted" : "Couldn't delete tag", {
        kind: res.ok ? "success" : "error",
        description: res.ok ? t.name : res.message,
      });
      if (res.ok) {
        // Re-runs the route loader
        await router.invalidate();
      }
    });
  };

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="w-20 text-right">Posts</TableHead>
              {canManage && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.length === 0 && (
              <EmptyRow
                colSpan={canManage ? 4 : 3}
                title="No tags yet"
                description="Add tags to a post in its editor; they show up here."
              />
            )}
            {tags.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {t.slug}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    to="/admin/posts"
                    search={{
                      tag: t.slug,
                    }}
                    className="hover:underline"
                  >
                    {t.postCount}
                  </Link>
                </TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Rename ${t.name}`}
                      onClick={() => setEditing(t)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${t.name}`}
                      disabled={pending}
                      onClick={() => remove(t)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {editing && (
        <RenameDialog
          key={editing.id}
          tag={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  );
}

function RenameDialog({ tag, onClose }: { tag: PostTag; onClose: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<PostState>({});
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const res = await renamePostTag(new FormData(e.currentTarget));
    setSaving(false);
    setState(res);
    if (res.ok) {
      notify(res.message ?? "Saved", {
        kind: "success",
      });
      await router.invalidate();
      onClose();
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename tag</DialogTitle>
          <DialogDescription>
            The slug follows the name, so its page at /posts/tags/{tag.slug} moves.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={tag.id} />
          {state.message && !state.ok && !state.fieldErrors && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          <FieldGroup>
            <Field data-invalid={!!state.fieldErrors?.name || undefined}>
              <FieldLabel htmlFor="tag-name">Name</FieldLabel>
              <Input
                id="tag-name"
                name="name"
                maxLength={100}
                aria-invalid={!!state.fieldErrors?.name || undefined}
                defaultValue={tag.name}
              />
              <FieldError>{state.fieldErrors?.name}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
