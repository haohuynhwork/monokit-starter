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
import { useRouter } from "@tanstack/react-router";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useRef, useState, useTransition } from "react";
import { EmptyRow } from "@/components/empty-row";
import { notify } from "@/components/toast";
import type { GeoFormState } from "@/lib/admin/geo-call";
import { submitKeepingValues } from "@/lib/admin/submit-keeping-values";
import { currencyDigits } from "@/lib/money";
import type { ShopActionState } from "@/lib/shop";
import type { Currency } from "@/lib/types";
import { deleteCurrency, saveCurrency, setCurrencyActive } from "./actions";

function currencyName(code: string): string {
  try {
    return (
      new Intl.DisplayNames(
        [
          "en",
        ],
        {
          type: "currency",
        },
      ).of(code) ?? ""
    );
  } catch {
    return "";
  }
}

// "1 USD = 25,450.5 VND"
function rateLabel(base: string, c: Currency): string {
  const n = Number(c.rate);
  return `1 ${base} = ${n.toLocaleString("en", {
    maximumFractionDigits: 10,
  })} ${c.code}`;
}

export function CurrencyList({
  base,
  currencies,
}: {
  base: string;
  currencies: Currency[];
}) {
  const router = useRouter();
  // undefined: closed; null: new; else the currency being edited
  const [editing, setEditing] = useState<Currency | null | undefined>();
  const [pending, startTransition] = useTransition();

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

  const remove = (c: Currency) => {
    if (!confirm(`Delete ${c.code}?`)) {
      return;
    }
    run(() => deleteCurrency(c.id), "Couldn't delete currency", c.code);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setEditing(null)}>
          <Plus /> New currency
        </Button>
        <span className="text-sm text-muted-foreground">
          Base currency: <span className="font-medium">{base}</span>
        </span>
      </div>
      {!currencies.some((c) => c.isBase) && (
        <p className="rounded-lg border border-amber-500/50 bg-card p-3 text-sm">
          The base currency {base} is not listed yet; add it with rate 1.
        </p>
      )}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Currency</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Rate updated</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {currencies.length === 0 && (
              <EmptyRow
                colSpan={5}
                title="No currencies yet"
                description="Add one with “New currency”; prices use the shop currency."
              />
            )}
            {currencies.map((c) => (
              <TableRow
                key={c.id}
                className={c.active ? undefined : "text-muted-foreground"}
              >
                <TableCell>
                  <span className="font-mono text-xs">{c.code}</span>{" "}
                  <span className="font-medium">{c.name}</span>
                  {c.symbol && (
                    <span className="text-muted-foreground"> ({c.symbol})</span>
                  )}
                </TableCell>
                <TableCell className="tabular-nums">
                  {c.isBase ? "1 (base)" : rateLabel(base, c)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.isBase ? "—" : new Date(c.rateAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  {c.isBase ? (
                    <Badge>Base</Badge>
                  ) : (
                    <Badge variant={c.active ? "secondary" : "outline"}>
                      {c.active ? "Active" : "Inactive"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!c.isBase && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${c.active ? "Deactivate" : "Activate"} ${c.code}`}
                      title={c.active ? "Deactivate" : "Activate"}
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => setCurrencyActive(c.id, !c.active),
                          "Couldn't update currency",
                          c.code,
                        )
                      }
                    >
                      {c.active ? <EyeOff /> : <Eye />}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${c.code}`}
                    onClick={() => setEditing(c)}
                  >
                    <Pencil />
                  </Button>
                  {!c.isBase && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${c.code}`}
                      disabled={pending}
                      onClick={() => remove(c)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {editing !== undefined && (
        <CurrencyDialog
          key={editing?.id ?? "new"}
          base={base}
          currency={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

function CurrencyDialog({
  base,
  currency,
  onClose,
}: {
  base: string;
  currency: Currency | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, saving] = useActionState<GeoFormState, FormData>(
    async (prev, formData) => {
      const res = await saveCurrency(prev, formData);
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
  const isBase = !!currency?.isBase;
  const [code, setCode] = useState(currency?.code ?? "");
  const name = useRef<HTMLInputElement>(null);
  const decimals = useRef<HTMLInputElement>(null);
  const newIsBase = !currency && code.toUpperCase() === base;

  // Fill the name and decimals from Intl once a full code is typed
  const onCode = (value: string) => {
    setCode(value);
    const c = value.trim().toUpperCase();
    if (c.length !== 3) {
      return;
    }
    const known = currencyName(c);
    if (known && name.current && !name.current.value) {
      name.current.value = known;
    }
    if (known && decimals.current) {
      decimals.current.value = String(currencyDigits(c));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {currency ? `Edit ${currency.code}` : "New currency"}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={submitKeepingValues(action)}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="id" value={currency?.id ?? ""} />
          {state.message && !state.ok && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
              <Field data-invalid={!!fieldError("code") || undefined}>
                <FieldLabel htmlFor="cur-code">Code</FieldLabel>
                <Input
                  id="cur-code"
                  aria-invalid={!!fieldError("code") || undefined}
                  name="code"
                  disabled={!!currency}
                  value={code}
                  onChange={(e) => onCode(e.target.value)}
                  maxLength={3}
                  title="3 letters (ISO 4217), e.g. VND"
                  placeholder="VND"
                  className="font-mono uppercase"
                />
                <FieldError>{fieldError("code")}</FieldError>
              </Field>
              <Field data-invalid={!!fieldError("name") || undefined}>
                <FieldLabel htmlFor="cur-name">Name</FieldLabel>
                <Input
                  id="cur-name"
                  aria-invalid={!!fieldError("name") || undefined}
                  name="name"
                  ref={name}
                  defaultValue={currency?.name}
                />
                <FieldError>{fieldError("name")}</FieldError>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field data-invalid={!!fieldError("symbol") || undefined}>
                <FieldLabel htmlFor="cur-symbol">Symbol</FieldLabel>
                <Input
                  id="cur-symbol"
                  aria-invalid={!!fieldError("symbol") || undefined}
                  name="symbol"
                  maxLength={10}
                  defaultValue={currency?.symbol}
                  placeholder="₫"
                />
                <FieldError>{fieldError("symbol")}</FieldError>
              </Field>
              <Field data-invalid={!!fieldError("decimals") || undefined}>
                <FieldLabel htmlFor="cur-decimals">Decimals</FieldLabel>
                <Input
                  id="cur-decimals"
                  aria-invalid={!!fieldError("decimals") || undefined}
                  name="decimals"
                  ref={decimals}
                  type="number"
                  defaultValue={currency?.decimals ?? 2}
                />
                <FieldError>{fieldError("decimals")}</FieldError>
              </Field>
              <Field data-invalid={!!fieldError("position") || undefined}>
                <FieldLabel htmlFor="cur-position">Position</FieldLabel>
                <Input
                  id="cur-position"
                  aria-invalid={!!fieldError("position") || undefined}
                  name="position"
                  type="number"
                  defaultValue={currency?.position ?? 0}
                />
                <FieldError>{fieldError("position")}</FieldError>
              </Field>
            </div>
            <Field data-invalid={!!fieldError("rate") || undefined}>
              <FieldLabel htmlFor="cur-rate">
                Rate (1 {base} = ?{" "}
                {currency?.code ?? (code.toUpperCase() || "…")})
              </FieldLabel>
              {isBase || newIsBase ? (
                <>
                  <input type="hidden" name="rate" value="1" />
                  <Input id="cur-rate" value="1" disabled />
                  <p className="text-xs text-muted-foreground">
                    The base currency rate is always 1. Change the base in
                    Settings → Currency.
                  </p>
                </>
              ) : (
                <Input
                  id="cur-rate"
                  name="rate"
                  aria-invalid={!!fieldError("rate") || undefined}
                  inputMode="decimal"
                  title="A number above 0 with up to 10 decimals"
                  defaultValue={currency?.rate}
                  placeholder="25450.5"
                />
              )}
              <FieldError>{fieldError("rate")}</FieldError>
            </Field>
            {currency && !isBase && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={currency.active}
                />
                Active (offered to customers)
              </label>
            )}
            {isBase && <input type="hidden" name="active" value="on" />}
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
