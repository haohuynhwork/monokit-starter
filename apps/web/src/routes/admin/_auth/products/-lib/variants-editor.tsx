import { Button } from "@packages/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
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
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { fromMinor } from "@/lib/money";
import type { Product } from "@/lib/types";
import { setOptionValueImage, setVariantImage } from "./actions";
import { PhotoPicker, productPhotos } from "./photo-picker";

// The api's limits (ideas/orders/products.md)
const MAX_OPTIONS = 3;
const MAX_VALUES = 50;
const MAX_VARIANTS = 100;

type OptionDraft = {
  name: string;
  // As typed: "S, M, L"
  values: string;
};

// One row of the grid; prices as typed, converted by the save action
export type VariantDraft = {
  id?: string;
  sku: string;
  listPrice: string;
  salePrice: string;
  trackStock: boolean;
  stock: number;
};

const EMPTY_ROW: VariantDraft = {
  sku: "",
  listPrice: "",
  salePrice: "",
  trackStock: false,
  stock: 0,
};

const splitValues = (text: string) => [
  ...new Set(
    text
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  ),
];

// Options that count: a name and at least one value
function cleanOptions(drafts: OptionDraft[]) {
  return drafts
    .map((o) => ({
      name: o.name.trim(),
      values: splitValues(o.values),
    }))
    .filter((o) => o.name && o.values.length);
}

// Every combination, as values in option order; [[]] without options
function combinations(
  options: {
    values: string[];
  }[],
): string[][] {
  return options.reduce<string[][]>(
    (acc, o) =>
      acc.flatMap((combo) =>
        o.values.map((v) => [
          ...combo,
          v,
        ]),
      ),
    [
      [],
    ],
  );
}

// Rows are kept by their values in option order, so renaming an option or
// reordering values keeps prices; NUL can't be typed into a value
const keyOf = (values: string[]) => values.join("\u0000");

// The options and variants of a product, sent with the editor's form as JSON
// (hidden `options` and `variants` inputs). The grid has one row per
// combination of option values; a product without options has one row.
export function VariantsEditor({
  product,
  currency,
  fieldErrors,
}: {
  product: Product | null;
  currency: string;
  // From the save action: options.<i> (of the sent options), variants.<i>
  // and variants.<i>.<field> (sku, listPrice, salePrice, stock)
  fieldErrors?: Record<string, string>;
}) {
  const [options, setOptions] = useState<OptionDraft[]>(
    () =>
      product?.options.map((o) => ({
        name: o.name,
        values: o.values.join(", "),
      })) ?? [],
  );
  const [rows, setRows] = useState<Map<string, VariantDraft>>(() => {
    const map = new Map<string, VariantDraft>();
    for (const v of product?.variants ?? []) {
      const values = (product?.options ?? []).map(
        (o) => v.values[o.name] ?? "",
      );
      map.set(keyOf(values), {
        id: v.id,
        sku: v.sku ?? "",
        listPrice: fromMinor(v.listPrice, currency),
        salePrice: v.sale ? fromMinor(v.sale, currency) : "",
        trackStock: v.trackStock,
        stock: v.stock ?? 0,
      });
    }
    return map;
  });
  const [bulk, setBulk] = useState({
    listPrice: "",
    salePrice: "",
    stock: "",
  });

  const clean = cleanOptions(options);
  // Sent options skip empty drafts, so errors are mapped back by index
  const sentIndex: (number | undefined)[] = [];
  let sent = 0;
  for (const o of options) {
    sentIndex.push(
      o.name.trim() && splitValues(o.values).length ? sent++ : undefined,
    );
  }
  const optionError = (i: number) =>
    sentIndex[i] === undefined
      ? undefined
      : fieldErrors?.[`options.${sentIndex[i]}`];
  const hasKey = (list: string) =>
    Object.keys(fieldErrors ?? {}).some((k) => k.startsWith(`${list}.`));
  const cellError = (i: number, name: string) =>
    fieldErrors?.[`variants.${i}.${name}`];
  // An api issue on the row but no input of it (e.g. its values)
  const rowError = (i: number) =>
    [
      "sku",
      "listPrice",
      "salePrice",
      "stock",
    ].some((n) => cellError(i, n))
      ? undefined
      : fieldErrors?.[`variants.${i}`];
  const combos = combinations(clean);
  const tooMany = combos.length > MAX_VARIANTS;

  // A product's single variant carries over to the first combination when
  // options are added, keeping its id (orders point at it) and its prices
  const only =
    rows.size === 1
      ? [
          ...rows.values(),
        ][0]
      : undefined;
  const rowFor = (values: string[], i: number): VariantDraft =>
    rows.get(keyOf(values)) ??
    (only && !rows.has(keyOf(combos[0] ?? []))
      ? {
          ...only,
          id: i === 0 ? only.id : undefined,
          sku: i === 0 ? only.sku : "",
        }
      : EMPTY_ROW);
  const variants = combos.map((values, i) => ({
    values,
    row: rowFor(values, i),
  }));

  // Every edit first keeps all shown rows as they are, so ones that carried
  // over from the single variant don't lose that once another row is set.
  // Rows of removed combinations stay too, for when a value comes back.
  const update = (values: string[], i: number, change: Partial<VariantDraft>) =>
    setRows((prev) => {
      const next = new Map(prev);
      for (const v of variants) {
        next.set(keyOf(v.values), v.row);
      }
      next.set(keyOf(values), {
        ...rowFor(values, i),
        ...change,
      });
      return next;
    });

  const applyToAll = () =>
    setRows((prev) => {
      const next = new Map(prev);
      variants.forEach(({ values, row }) => {
        next.set(keyOf(values), {
          ...row,
          ...(bulk.listPrice.trim() && {
            listPrice: bulk.listPrice.trim(),
          }),
          ...(bulk.salePrice.trim() && {
            salePrice: bulk.salePrice.trim(),
          }),
          ...(bulk.stock.trim() && {
            trackStock: true,
            stock: Math.max(0, Number.parseInt(bulk.stock, 10) || 0),
          }),
        });
      });
      return next;
    });

  // Images save on their own, so only saved variants and values get one
  const photos = product ? productPhotos(product) : [];
  const savedVariant = (id?: string) =>
    product?.variants.find((v) => v.id === id) ?? null;
  const savedValues = (name: string) =>
    product?.options.find((o) => o.name === name) ?? null;

  const setOption = (i: number, change: Partial<OptionDraft>) =>
    setOptions((prev) =>
      prev.map((o, j) =>
        j === i
          ? {
              ...o,
              ...change,
            }
          : o,
      ),
    );

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="options" value={JSON.stringify(clean)} />
      <input
        type="hidden"
        name="variants"
        value={JSON.stringify(
          variants.map(({ values, row }) => ({
            ...row,
            values: Object.fromEntries(
              clean.map((o, k) => [
                o.name,
                values[k],
              ]),
            ),
            name: values.join(" / "),
          })),
        )}
      />

      <Field
        data-invalid={
          !!(fieldErrors?.options || options.some((_, i) => optionError(i))) ||
          undefined
        }
      >
        <FieldLabel>Options</FieldLabel>
        {options.map((o, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Input
              aria-label={`Option ${i + 1} name`}
              placeholder="e.g. Size"
              aria-invalid={!!optionError(i) || undefined}
              value={o.name}
              maxLength={64}
              onChange={(e) =>
                setOption(i, {
                  name: e.target.value,
                })
              }
              className="w-36"
            />
            <Input
              aria-label={`Option ${i + 1} values`}
              placeholder="Values, comma separated: S, M, L"
              aria-invalid={!!optionError(i) || undefined}
              value={o.values}
              onChange={(e) =>
                setOption(i, {
                  values: e.target.value,
                })
              }
              className="min-w-48 flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove option ${o.name || i + 1}`}
              onClick={() =>
                setOptions((prev) => prev.filter((_, j) => j !== i))
              }
            >
              <X />
            </Button>
            {product && savedValues(o.name.trim()) && (
              <div className="flex w-full flex-wrap gap-2">
                {splitValues(o.values)
                  .filter((v) => savedValues(o.name.trim())?.values.includes(v))
                  .map((v) => {
                    const option = o.name.trim();
                    return (
                      <span
                        key={v}
                        className="flex items-center gap-1.5 rounded-md border py-0.5 pr-2 pl-0.5 text-xs"
                      >
                        <PhotoPicker
                          label={`${option}: ${v}`}
                          current={savedValues(option)?.images[v] ?? null}
                          photos={photos}
                          save={(assetId) =>
                            setOptionValueImage(product.id, option, v, assetId)
                          }
                        />
                        {v}
                      </span>
                    );
                  })}
              </div>
            )}
            {splitValues(o.values).length > MAX_VALUES ? (
              <p className="w-full text-xs text-destructive">
                At most {MAX_VALUES} values per option.
              </p>
            ) : (
              optionError(i) && (
                <FieldError className="w-full">{optionError(i)}</FieldError>
              )
            )}
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={options.length >= MAX_OPTIONS}
            onClick={() =>
              setOptions((prev) => [
                ...prev,
                {
                  name: "",
                  values: "",
                },
              ])
            }
          >
            <Plus /> Add option
          </Button>
        </div>
        <FieldDescription>
          {clean.length
            ? `${combos.length} variant${combos.length === 1 ? "" : "s"}, one per combination. At most ${MAX_OPTIONS} options.`
            : "No options: the product has one variant. Add one like Size or Color to sell several."}
        </FieldDescription>
        {!hasKey("options") && <FieldError>{fieldErrors?.options}</FieldError>}
      </Field>

      {tooMany ? (
        <p role="alert" className="text-sm text-destructive">
          {combos.length} combinations; at most {MAX_VARIANTS}. Remove some
          values.
        </p>
      ) : (
        <Field data-invalid={!!fieldErrors?.variants || undefined}>
          <FieldLabel>
            {clean.length ? "Variants" : "Price and stock"} ({currency})
          </FieldLabel>
          {variants.length > 1 && (
            <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/40 p-2">
              <span className="self-center text-xs text-muted-foreground">
                Set on all:
              </span>
              <Input
                aria-label="List price for all"
                placeholder="List price"
                inputMode="decimal"
                value={bulk.listPrice}
                onChange={(e) =>
                  setBulk({
                    ...bulk,
                    listPrice: e.target.value,
                  })
                }
                className="w-28"
              />
              <Input
                aria-label="Sale price for all"
                placeholder="Sale price"
                inputMode="decimal"
                value={bulk.salePrice}
                onChange={(e) =>
                  setBulk({
                    ...bulk,
                    salePrice: e.target.value,
                  })
                }
                className="w-28"
              />
              <Input
                aria-label="Stock for all"
                placeholder="Stock"
                type="number"
                value={bulk.stock}
                onChange={(e) =>
                  setBulk({
                    ...bulk,
                    stock: e.target.value,
                  })
                }
                className="w-24"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!bulk.listPrice && !bulk.salePrice && !bulk.stock}
                onClick={applyToAll}
              >
                Apply
              </Button>
            </div>
          )}
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  {product && <TableHead>Image</TableHead>}
                  {clean.length > 0 && <TableHead>Variant</TableHead>}
                  <TableHead>SKU</TableHead>
                  <TableHead>List price</TableHead>
                  <TableHead>Sale price</TableHead>
                  <TableHead>Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map(({ values, row }, i) => {
                  const label = values.join(" / ") || "Default";
                  return (
                    <TableRow key={keyOf(values)}>
                      {product && (
                        <TableCell>
                          {savedVariant(row.id) ? (
                            <PhotoPicker
                              label={label}
                              current={savedVariant(row.id)?.image ?? null}
                              photos={photos}
                              save={(assetId) =>
                                setVariantImage(product.id, row.id!, assetId)
                              }
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Save first
                            </span>
                          )}
                        </TableCell>
                      )}
                      {clean.length > 0 && (
                        <TableCell className="font-medium">
                          {label}
                          {rowError(i) && (
                            <FieldError className="text-xs font-normal">
                              {rowError(i)}
                            </FieldError>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Input
                          aria-label={`SKU, ${label}`}
                          aria-invalid={!!cellError(i, "sku") || undefined}
                          placeholder="Optional"
                          maxLength={64}
                          value={row.sku}
                          onChange={(e) =>
                            update(values, i, {
                              sku: e.target.value,
                            })
                          }
                          className="w-32"
                        />
                        {cellError(i, "sku") && (
                          <FieldError className="text-xs">
                            {cellError(i, "sku")}
                          </FieldError>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={`List price, ${label}`}
                          aria-invalid={
                            !!cellError(i, "listPrice") || undefined
                          }
                          inputMode="decimal"
                          placeholder="19.99"
                          value={row.listPrice}
                          onChange={(e) =>
                            update(values, i, {
                              listPrice: e.target.value,
                            })
                          }
                          className="w-28"
                        />
                        {cellError(i, "listPrice") && (
                          <FieldError className="text-xs">
                            {cellError(i, "listPrice")}
                          </FieldError>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={`Sale price, ${label}`}
                          aria-invalid={
                            !!cellError(i, "salePrice") || undefined
                          }
                          inputMode="decimal"
                          placeholder="No sale"
                          value={row.salePrice}
                          onChange={(e) =>
                            update(values, i, {
                              salePrice: e.target.value,
                            })
                          }
                          className="w-28"
                        />
                        {cellError(i, "salePrice") && (
                          <FieldError className="text-xs">
                            {cellError(i, "salePrice")}
                          </FieldError>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            aria-label={`Track stock, ${label}`}
                            checked={row.trackStock}
                            onChange={(e) =>
                              update(values, i, {
                                trackStock: e.target.checked,
                              })
                            }
                            className="size-4 accent-primary"
                          />
                          <Input
                            aria-label={`Stock, ${label}`}
                            aria-invalid={!!cellError(i, "stock") || undefined}
                            type="number"
                            disabled={!row.trackStock}
                            value={row.trackStock ? row.stock : ""}
                            placeholder="Not tracked"
                            onChange={(e) =>
                              update(values, i, {
                                stock: Math.max(
                                  0,
                                  Number.parseInt(e.target.value, 10) || 0,
                                ),
                              })
                            }
                            className="w-24"
                          />
                        </div>
                        {cellError(i, "stock") && (
                          <FieldError className="text-xs">
                            {cellError(i, "stock")}
                          </FieldError>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <FieldDescription>
            {product &&
              "Images: a variant's own, else its option value's (set next to the values above), else the cover. "}
            Sale prices apply during the sale window below; blank means no sale.
            Tick stock to count it: orders take from it and can&apos;t go below
            0. Unticked: always available.
          </FieldDescription>
          {/* Without options the row has no label cell for its error */}
          <FieldError>
            {(clean.length === 0 && rowError(0)) ||
              (!hasKey("variants") && fieldErrors?.variants) ||
              undefined}
          </FieldError>
        </Field>
      )}
    </div>
  );
}
