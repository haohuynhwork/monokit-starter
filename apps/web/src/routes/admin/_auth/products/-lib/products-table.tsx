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
import { Archive, ImageOff, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { EmptyRow, type EmptyText } from "@/components/empty-row";
import { notify } from "@/components/toast";
import { trackedStock } from "@/lib/product";
import type { ShopActionState } from "@/lib/shop";
import type { Category, Product } from "@/lib/types";
import { deleteProduct, setProductStatus } from "./actions";
import { ProductPrice } from "./price-tag";
import { ProductStatusBadge } from "./status-badge";

const BULK = {
  archive: {
    label: "Archive",
    run: (id: string) => setProductStatus(id, "archived"),
  },
  delete: {
    label: "Delete",
    run: deleteProduct,
  },
} satisfies Record<
  string,
  {
    label: string;
    run: (id: string) => Promise<ShopActionState>;
  }
>;

export function ProductsTable({
  products,
  categories,
  currency,
  empty,
}: {
  products: Product[];
  categories: Category[];
  currency: string;
  // Shown in the table when there are no products
  empty: EmptyText;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const categoryName = new Map(
    categories.map((c) => [
      c.id,
      c.name,
    ]),
  );
  const allSelected =
    products.length > 0 && products.every((p) => selected.has(p.id));
  const chosen = products.filter((p) => selected.has(p.id));

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
    const label = BULK[kind].label;
    if (!confirm(`${label} ${n} product${n > 1 ? "s" : ""}?`)) {
      return;
    }
    startTransition(async () => {
      const failed: string[] = [];
      for (const p of chosen) {
        const res = await BULK[kind].run(p.id);
        if (!res.ok) {
          failed.push(`${p.name}: ${res.message ?? "failed"}`);
        }
      }
      if (failed.length) {
        notify(`${label}: ${n - failed.length} of ${n} done`, {
          kind: "error",
          description: failed.join("; "),
        });
      } else {
        notify(`${label}d ${n} product${n > 1 ? "s" : ""}`, {
          kind: "success",
        });
      }
      setSelected(new Set());
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
        <Button
          variant="outline"
          size="xs"
          className="ml-auto"
          disabled={pending || selected.size === 0}
          onClick={() => run("archive")}
        >
          <Archive /> Archive
        </Button>
        <Button
          variant="destructive"
          size="xs"
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
                  disabled={products.length === 0}
                  onChange={() =>
                    setSelected(
                      allSelected
                        ? new Set()
                        : new Set(products.map((p) => p.id)),
                    )
                  }
                  className="size-4 accent-primary"
                />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && <EmptyRow {...empty} colSpan={6} />}
            {products.map((p) => (
              <TableRow
                key={p.id}
                data-state={selected.has(p.id) ? "selected" : undefined}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`Select ${p.name}`}
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="size-4 accent-primary"
                  />
                </TableCell>
                <TableCell>
                  <Link
                    to="/admin/products/$id"
                    params={{
                      id: p.id,
                    }}
                    className="flex items-center gap-3 hover:underline"
                  >
                    {p.cover?.url ? (
                      <img
                        src={p.cover.url}
                        alt=""
                        className="size-9 rounded-md border object-cover"
                      />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-md border text-muted-foreground">
                        <ImageOff className="size-4" />
                      </span>
                    )}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {p.variants.length > 1
                          ? `${p.variants.length} variants`
                          : (p.variants[0]?.sku ?? p.slug)}
                      </span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {(p.categoryId && categoryName.get(p.categoryId)) ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <ProductPrice product={p} currency={currency} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {trackedStock(p) !== null ? (
                    trackedStock(p)
                  ) : (
                    <span className="text-muted-foreground" title="Not tracked">
                      —
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <ProductStatusBadge status={p.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
