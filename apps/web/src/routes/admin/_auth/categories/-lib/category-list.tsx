import { Button } from "@packages/ui/components/button";
import {
  Dialog,
  DialogContent,
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
import { useRouter } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";
import { EmptyRow } from "@/components/empty-row";
import { notify } from "@/components/toast";
import { categoryTree } from "@/lib/admin/tree";
import { api, type Category, type FormState } from "@/lib/api";
import { saveCategory } from "./save-category";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm";

export function CategoryList({ categories }: { categories: Category[] }) {
  // undefined: closed; null: new; else the category being edited
  const [editing, setEditing] = useState<Category | null | undefined>();
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const rows = categoryTree(categories);

  const remove = (c: Category) => {
    if (!confirm(`Delete “${c.name}”?`)) {
      return;
    }
    startTransition(async () => {
      const res = await api(`/categories/${c.id}`, {
        method: "DELETE",
      });
      if (res.status === "success") {
        notify("Category deleted", {
          kind: "success",
          description: c.name,
        });
        // Re-runs the route loader
        await router.invalidate();
      } else {
        notify("Couldn't delete category", {
          kind: "error",
          description: res.message ?? undefined,
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button size="sm" onClick={() => setEditing(null)}>
          <Plus /> New category
        </Button>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="w-20">Position</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <EmptyRow
                colSpan={4}
                title="No categories yet"
                description="Add the first one with “New category”."
              />
            )}
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <span
                    style={{
                      paddingLeft: `${c.depth * 1.25}rem`,
                    }}
                    className="font-medium"
                  >
                    {c.depth > 0 && (
                      <span className="mr-1 text-muted-foreground">└</span>
                    )}
                    {c.name}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.slug}
                </TableCell>
                <TableCell>{c.position}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${c.name}`}
                    onClick={() => setEditing(c)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${c.name}`}
                    disabled={pending}
                    onClick={() => remove(c)}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {editing !== undefined && (
        <CategoryDialog
          key={editing?.id ?? "new"}
          category={editing}
          categories={categories}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

function CategoryDialog({
  category,
  categories,
  onClose,
}: {
  category: Category | null;
  categories: Category[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({});
  const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const res = await saveCategory(new FormData(e.currentTarget));
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
  // A category can't go under itself or its descendants (the api checks too)
  const blocked = new Set<string>();
  if (category) {
    blocked.add(category.id);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of categories) {
        if (c.parentId && blocked.has(c.parentId) && !blocked.has(c.id)) {
          blocked.add(c.id);
          grew = true;
        }
      }
    }
  }
  const fieldError = (name: string) => state.fieldErrors?.[name];
  const invalid = (name: string) => !!fieldError(name) || undefined;
  const parents = categoryTree(categories).filter((c) => !blocked.has(c.id));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {category ? "Edit category" : "New category"}
          </DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={category?.id ?? ""} />
          {state.message && !state.ok && !state.fieldErrors && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          <FieldGroup>
            <Field data-invalid={invalid("name")}>
              <FieldLabel htmlFor="cat-name">Name</FieldLabel>
              <Input
                id="cat-name"
                aria-invalid={invalid("name")}
                name="name"
                defaultValue={category?.name}
              />
              <FieldError>{fieldError("name")}</FieldError>
            </Field>
            <Field data-invalid={invalid("slug")}>
              <FieldLabel htmlFor="cat-slug">Slug</FieldLabel>
              <Input
                id="cat-slug"
                aria-invalid={invalid("slug")}
                name="slug"
                defaultValue={category?.slug}
                placeholder="e.g. shirts"
              />
              <FieldError>{fieldError("slug")}</FieldError>
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
              <Field data-invalid={invalid("parentId")}>
                <FieldLabel htmlFor="cat-parent">Parent</FieldLabel>
                <select
                  id="cat-parent"
                  aria-invalid={invalid("parentId")}
                  name="parentId"
                  defaultValue={category?.parentId ?? ""}
                  className={selectClass}
                >
                  <option value="">None (top level)</option>
                  {parents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {"— ".repeat(c.depth)}
                      {c.name}
                    </option>
                  ))}
                </select>
                <FieldError>{fieldError("parentId")}</FieldError>
              </Field>
              <Field data-invalid={invalid("position")}>
                <FieldLabel htmlFor="cat-position">Position</FieldLabel>
                <Input
                  id="cat-position"
                  aria-invalid={invalid("position")}
                  name="position"
                  type="number"
                  defaultValue={category?.position ?? 0}
                />
                <FieldError>{fieldError("position")}</FieldError>
              </Field>
            </div>
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
