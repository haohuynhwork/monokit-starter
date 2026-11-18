import { COUNTRIES, countryName } from "@packages/geo";
import { Badge } from "@packages/ui/components/badge";
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
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState, useTransition } from "react";
import { EmptyRow } from "@/components/empty-row";
import { notify } from "@/components/toast";
import type { GeoFormState } from "@/lib/admin/geo-call";
import { submitKeepingValues } from "@/lib/admin/submit-keeping-values";
import { categoryTree } from "@/lib/admin/tree";
import type { ShopActionState } from "@/lib/shop";
import type { Region } from "@/lib/types";
import { deleteRegion, saveRegion, setRegionActive } from "./actions";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm";

export function RegionList({
  country,
  regions,
}: {
  country: string;
  regions: Region[];
}) {
  const router = useRouter();
  const navigate = useNavigate();
  // undefined: closed; null: new; else the region being edited
  const [editing, setEditing] = useState<Region | null | undefined>();
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();
  const countries = useMemo(
    () =>
      COUNTRIES.map((code) => ({
        code,
        name: countryName(code),
      })).sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );
  const needle = q.trim().toLowerCase();
  const rows = categoryTree(regions).filter(
    (r) =>
      !needle ||
      r.name.toLowerCase().includes(needle) ||
      r.code.toLowerCase().includes(needle),
  );

  const run = (
    call: () => Promise<ShopActionState>,
    failed: string,
    name: string,
  ) => {
    startTransition(async () => {
      const res = await call();
      if (res.ok) {
        // Re-runs the route loader
        await router.invalidate();
      }
      notify(res.ok ? (res.message ?? "Done") : failed, {
        kind: res.ok ? "success" : "error",
        description: res.ok ? name : res.message,
      });
    });
  };

  const remove = (r: Region) => {
    if (!confirm(`Delete “${r.name}”?`)) {
      return;
    }
    run(() => deleteRegion(r.id), "Couldn't delete region", r.name);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Country"
          value={country}
          onChange={(e) =>
            navigate({
              to: "/admin/regions",
              search: {
                country: e.target.value,
              },
            })
          }
          className={`${selectClass} max-w-64`}
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
        <Input
          type="search"
          placeholder="Filter by name or code"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-64"
        />
        <Button size="sm" onClick={() => setEditing(null)}>
          <Plus /> New region
        </Button>
        <span className="text-sm text-muted-foreground">
          {regions.filter((r) => r.active).length} active of {regions.length}
        </span>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="w-20">Position</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <EmptyRow
                colSpan={5}
                {...(regions.length === 0
                  ? {
                      title: `No regions for ${countryName(country)} yet`,
                      description:
                        "Addresses there use a typed region. Add one with “New region”.",
                    }
                  : {
                      title: "No regions match",
                      description: "Nothing matches this search.",
                    })}
              />
            )}
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className={r.active ? undefined : "text-muted-foreground"}
              >
                <TableCell>
                  <span
                    style={{
                      paddingLeft: `${needle ? 0 : r.depth * 1.25}rem`,
                    }}
                    className="font-medium"
                  >
                    {r.depth > 0 && !needle && (
                      <span className="mr-1 text-muted-foreground">└</span>
                    )}
                    {r.name}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {r.code}
                </TableCell>
                <TableCell>{r.position}</TableCell>
                <TableCell>
                  <Badge variant={r.active ? "secondary" : "outline"}>
                    {r.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${r.active ? "Deactivate" : "Activate"} ${r.name}`}
                    title={r.active ? "Deactivate" : "Activate"}
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => setRegionActive(r.id, !r.active),
                        "Couldn't update region",
                        r.name,
                      )
                    }
                  >
                    {r.active ? <EyeOff /> : <Eye />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${r.name}`}
                    onClick={() => setEditing(r)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${r.name}`}
                    disabled={pending}
                    onClick={() => remove(r)}
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
        <RegionDialog
          key={editing?.id ?? "new"}
          country={country}
          region={editing}
          regions={regions}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

function RegionDialog({
  country,
  region,
  regions,
  onClose,
}: {
  country: string;
  region: Region | null;
  regions: Region[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, saving] = useActionState<GeoFormState, FormData>(
    async (prev, formData) => {
      const res = await saveRegion(prev, formData);
      if (res.ok) {
        notify(res.message ?? "Saved", {
          kind: "success",
        });
        await router.invalidate();
        onClose();
      }
      return res;
    },
    {},
  );
  const fieldError = (name: string) => state.fieldErrors?.[name];
  // A region can't go under itself or its descendants (the api checks too)
  const blocked = new Set<string>();
  if (region) {
    blocked.add(region.id);
    let grew = true;
    while (grew) {
      grew = false;
      for (const r of regions) {
        if (r.parentId && blocked.has(r.parentId) && !blocked.has(r.id)) {
          blocked.add(r.id);
          grew = true;
        }
      }
    }
  }
  const parents = categoryTree(regions).filter((r) => !blocked.has(r.id));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {region ? "Edit region" : `New region in ${countryName(country)}`}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={submitKeepingValues(action)}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="id" value={region?.id ?? ""} />
          <input type="hidden" name="countryCode" value={country} />
          {state.message && !state.ok && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          <FieldGroup>
            <Field data-invalid={!!fieldError("name") || undefined}>
              <FieldLabel htmlFor="region-name">Name</FieldLabel>
              <Input
                id="region-name"
                aria-invalid={!!fieldError("name") || undefined}
                name="name"
                defaultValue={region?.name}
              />
              <FieldError>{fieldError("name")}</FieldError>
            </Field>
            <Field data-invalid={!!fieldError("code") || undefined}>
              <FieldLabel htmlFor="region-code">Code</FieldLabel>
              <Input
                id="region-code"
                aria-invalid={!!fieldError("code") || undefined}
                name="code"
                disabled={!!region}
                defaultValue={region?.code ?? `${country}-`}
                maxLength={20}
                title={`Starts with ${country}-, e.g. ${country}-01`}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {region
                  ? "Fixed: addresses store it."
                  : "The ISO 3166-2 code when there is one; can't be changed later."}
              </p>
              <FieldError>{fieldError("code")}</FieldError>
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
              <Field data-invalid={!!fieldError("parentId") || undefined}>
                <FieldLabel htmlFor="region-parent">Parent</FieldLabel>
                <select
                  id="region-parent"
                  aria-invalid={!!fieldError("parentId") || undefined}
                  name="parentId"
                  defaultValue={region?.parentId ?? ""}
                  className={selectClass}
                >
                  <option value="">None (top level)</option>
                  {parents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {"— ".repeat(r.depth)}
                      {r.name}
                    </option>
                  ))}
                </select>
                <FieldError>{fieldError("parentId")}</FieldError>
              </Field>
              <Field data-invalid={!!fieldError("position") || undefined}>
                <FieldLabel htmlFor="region-position">Position</FieldLabel>
                <Input
                  id="region-position"
                  aria-invalid={!!fieldError("position") || undefined}
                  name="position"
                  type="number"
                  defaultValue={region?.position ?? 0}
                />
                <FieldError>{fieldError("position")}</FieldError>
              </Field>
            </div>
            {region && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={region.active}
                />
                Active (shown in the address picker)
              </label>
            )}
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
