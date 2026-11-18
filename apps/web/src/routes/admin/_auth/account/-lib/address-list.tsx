import { countryName } from "@packages/geo";
import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@packages/ui/components/dialog";
import { useRouter } from "@tanstack/react-router";
import { MapPin, Plus } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";
import { AddressFields } from "@/components/address-fields";
import { notify } from "@/components/toast";
import type { SavedAddress } from "@/lib/types";
import {
  type AddressState,
  deleteAddress,
  makeDefault,
  saveAddress,
} from "./address-actions";

export function AddressList({
  addresses,
  allowedCountries,
}: {
  addresses: SavedAddress[];
  allowedCountries: string[] | null;
}) {
  // null: closed; "new" or the address being edited
  const [editing, setEditing] = useState<SavedAddress | "new" | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> Add address
        </Button>
      </div>
      {addresses.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No addresses yet.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <AddressCard
              key={a.id}
              address={a}
              shipped={
                allowedCountries === null ||
                allowedCountries.includes(a.countryCode)
              }
              onEdit={() => setEditing(a)}
            />
          ))}
        </ul>
      )}
      {editing && (
        <AddressDialog
          // Fresh form per address
          key={editing === "new" ? "new" : editing.id}
          address={editing === "new" ? null : editing}
          allowedCountries={allowedCountries}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function AddressCard({
  address: a,
  shipped,
  onEdit,
}: {
  address: SavedAddress;
  shipped: boolean;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<AddressState>, done: string) =>
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        await router.invalidate();
      }
      notify(res.ok ? done : "Something went wrong", {
        kind: res.ok ? "success" : "error",
        description: res.ok ? undefined : res.message,
      });
    });
  return (
    <li className="flex flex-col gap-2 rounded-lg border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <MapPin className="size-4 text-muted-foreground" />
        <span className="font-medium">{a.label ?? a.recipientName}</span>
        {a.isDefault && <Badge variant="secondary">Default</Badge>}
        {!shipped && <Badge variant="outline">Not shipped to</Badge>}
      </div>
      <address className="not-italic text-muted-foreground">
        {a.recipientName} · {a.phone}
        <br />
        {a.line1}
        {a.line2 && `, ${a.line2}`}
        <br />
        {[
          a.city,
          a.region,
          a.postalCode,
        ]
          .filter(Boolean)
          .join(", ")}
        <br />
        {countryName(a.countryCode)}
      </address>
      <div className="mt-auto flex flex-wrap gap-1">
        <Button variant="outline" size="xs" disabled={pending} onClick={onEdit}>
          Edit
        </Button>
        {!a.isDefault && (
          <Button
            variant="ghost"
            size="xs"
            disabled={pending}
            onClick={() => run(() => makeDefault(a.id), "Default address set")}
          >
            Make default
          </Button>
        )}
        <Button
          variant="ghost"
          size="xs"
          className="ml-auto text-destructive"
          disabled={pending}
          onClick={() => {
            if (confirm("Delete this address?")) {
              run(() => deleteAddress(a.id), "Address deleted");
            }
          }}
        >
          Delete
        </Button>
      </div>
    </li>
  );
}

function AddressDialog({
  address,
  allowedCountries,
  onClose,
}: {
  address: SavedAddress | null;
  allowedCountries: string[] | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<AddressState>({});
  const [pending, setPending] = useState(false);
  // Submitted by hand so a failed save keeps what was typed
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const res = await saveAddress(
      address?.id ?? null,
      new FormData(e.currentTarget),
    );
    setPending(false);
    setState(res);
    if (res.ok) {
      notify(address ? "Address saved" : "Address added", {
        kind: "success",
      });
      onClose();
      await router.invalidate();
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{address ? "Edit address" : "New address"}</DialogTitle>
          <DialogDescription>
            {allowedCountries
              ? "Only countries the shop ships to are listed."
              : "Pick your country, then your region."}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="flex flex-col gap-4">
          <AddressFields
            allowedCountries={allowedCountries}
            defaultValue={address ?? undefined}
            errors={state.fieldErrors}
          />
          {!address?.isDefault && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isDefault"
                className="size-4 accent-primary"
              />
              Use as my default address
            </label>
          )}
          {state.message && !state.ok && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
