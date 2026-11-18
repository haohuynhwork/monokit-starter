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
import { Eye, EyeOff, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useActionState, useRef, useState, useTransition } from "react";
import { EmptyRow } from "@/components/empty-row";
import { notify } from "@/components/toast";
import type { GeoFormState } from "@/lib/admin/geo-call";
import { submitKeepingValues } from "@/lib/admin/submit-keeping-values";
import type { ShopActionState } from "@/lib/shop";
import type { Locale } from "@/lib/types";
import { deleteLocale, saveLocale, updateLocale } from "./actions";

// Names from Intl: in English and in the locale itself
function localeNames(code: string): {
  name: string;
  nativeName: string;
} {
  try {
    const name = new Intl.DisplayNames(
      [
        "en",
      ],
      {
        type: "language",
      },
    ).of(code);
    const nativeName = new Intl.DisplayNames(
      [
        code,
      ],
      {
        type: "language",
      },
    ).of(code);
    return {
      name: name && name !== code ? name : "",
      nativeName: nativeName && nativeName !== code ? nativeName : "",
    };
  } catch {
    return {
      name: "",
      nativeName: "",
    };
  }
}

export function LocaleList({ locales }: { locales: Locale[] }) {
  const router = useRouter();
  // undefined: closed; null: new; else the locale being edited
  const [editing, setEditing] = useState<Locale | null | undefined>();
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

  const remove = (l: Locale) => {
    if (!confirm(`Delete ${l.name}?`)) {
      return;
    }
    run(() => deleteLocale(l.id), "Couldn't delete locale", l.name);
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button size="sm" onClick={() => setEditing(null)}>
          <Plus /> New locale
        </Button>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Locale</TableHead>
              <TableHead className="w-24">Code</TableHead>
              <TableHead className="w-24">Direction</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {locales.length === 0 && (
              <EmptyRow
                colSpan={5}
                title="No locales yet"
                description="Add one with “New locale”; the first becomes the default."
              />
            )}
            {locales.map((l) => (
              <TableRow
                key={l.id}
                className={l.active ? undefined : "text-muted-foreground"}
              >
                <TableCell>
                  <span className="font-medium">{l.name}</span>
                  {l.nativeName !== l.name && (
                    <span
                      className="text-muted-foreground"
                      dir={l.rtl ? "rtl" : undefined}
                      lang={l.code}
                    >
                      {" "}
                      · {l.nativeName}
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{l.code}</TableCell>
                <TableCell>{l.rtl ? "RTL" : "LTR"}</TableCell>
                <TableCell>
                  {l.isDefault ? (
                    <Badge>Default</Badge>
                  ) : (
                    <Badge variant={l.active ? "secondary" : "outline"}>
                      {l.active ? "Active" : "Inactive"}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {!l.isDefault && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Make ${l.name} the default`}
                        title="Make default"
                        disabled={pending || !l.active}
                        onClick={() =>
                          run(
                            () =>
                              updateLocale(
                                l.id,
                                {
                                  isDefault: true,
                                },
                                "Default locale changed.",
                              ),
                            "Couldn't change the default",
                            l.name,
                          )
                        }
                      >
                        <Star />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${l.active ? "Deactivate" : "Activate"} ${l.name}`}
                        title={l.active ? "Deactivate" : "Activate"}
                        disabled={pending}
                        onClick={() =>
                          run(
                            () =>
                              updateLocale(
                                l.id,
                                {
                                  active: !l.active,
                                },
                                l.active
                                  ? "Locale deactivated."
                                  : "Locale activated.",
                              ),
                            "Couldn't update locale",
                            l.name,
                          )
                        }
                      >
                        {l.active ? <EyeOff /> : <Eye />}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${l.name}`}
                    onClick={() => setEditing(l)}
                  >
                    <Pencil />
                  </Button>
                  {!l.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${l.name}`}
                      disabled={pending}
                      onClick={() => remove(l)}
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
        <LocaleDialog
          key={editing?.id ?? "new"}
          locale={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

function LocaleDialog({
  locale,
  onClose,
}: {
  locale: Locale | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, saving] = useActionState<GeoFormState, FormData>(
    async (prev, formData) => {
      const res = await saveLocale(prev, formData);
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
  const name = useRef<HTMLInputElement>(null);
  const nativeName = useRef<HTMLInputElement>(null);

  // Fill the names from Intl when the code is known and they're empty
  const onCode = (value: string) => {
    const known = localeNames(value.trim().replace(/_/g, "-"));
    if (known.name && name.current && !name.current.value) {
      name.current.value = known.name;
    }
    if (known.nativeName && nativeName.current && !nativeName.current.value) {
      nativeName.current.value = known.nativeName;
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {locale ? `Edit ${locale.name}` : "New locale"}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={submitKeepingValues(action)}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="id" value={locale?.id ?? ""} />
          {state.message && !state.ok && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          <FieldGroup>
            <Field data-invalid={!!fieldError("code") || undefined}>
              <FieldLabel htmlFor="loc-code">Code</FieldLabel>
              <Input
                id="loc-code"
                aria-invalid={!!fieldError("code") || undefined}
                name="code"
                disabled={!!locale}
                defaultValue={locale?.code}
                onBlur={(e) => onCode(e.target.value)}
                maxLength={16}
                title="BCP 47, e.g. vi-VN, en-US or en"
                placeholder="vi-VN"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {locale
                  ? "Fixed: translations will be stored under it."
                  : "Language plus region (BCP 47), e.g. vi-VN, en-US, or just en; can't be changed later."}
              </p>
              <FieldError>{fieldError("code")}</FieldError>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!fieldError("name") || undefined}>
                <FieldLabel htmlFor="loc-name">Name (English)</FieldLabel>
                <Input
                  id="loc-name"
                  aria-invalid={!!fieldError("name") || undefined}
                  name="name"
                  ref={name}
                  defaultValue={locale?.name}
                  placeholder="Vietnamese (Vietnam)"
                />
                <FieldError>{fieldError("name")}</FieldError>
              </Field>
              <Field data-invalid={!!fieldError("nativeName") || undefined}>
                <FieldLabel htmlFor="loc-native">Native name</FieldLabel>
                <Input
                  id="loc-native"
                  aria-invalid={!!fieldError("nativeName") || undefined}
                  name="nativeName"
                  ref={nativeName}
                  defaultValue={locale?.nativeName}
                  placeholder="Tiếng Việt (Việt Nam)"
                />
                <FieldError>{fieldError("nativeName")}</FieldError>
              </Field>
            </div>
            <Field data-invalid={!!fieldError("position") || undefined}>
              <FieldLabel htmlFor="loc-position">Position</FieldLabel>
              <Input
                id="loc-position"
                aria-invalid={!!fieldError("position") || undefined}
                name="position"
                type="number"
                defaultValue={locale?.position ?? 0}
                className="max-w-24"
              />
              <FieldError>{fieldError("position")}</FieldError>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="rtl" defaultChecked={locale?.rtl} />
              Right-to-left script (Arabic, Hebrew…)
            </label>
            {locale && !locale.isDefault && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={locale.active}
                />
                Active (offered on the site)
              </label>
            )}
            {locale?.isDefault && (
              <input type="hidden" name="active" value="on" />
            )}
            {!locale?.isDefault && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isDefault" />
                Make it the default locale
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
