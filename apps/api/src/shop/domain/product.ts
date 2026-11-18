import {
  InvalidShopInputError,
  InvalidVariantImageError,
} from "./shop.errors.js";
import { checkMoney, checkName, checkSlug } from "./shop.js";

// Rules from ideas/orders/products.md

export type ProductStatus = "draft" | "active" | "archived";

const MAX_OPTIONS = 3;
const MAX_VALUES = 50;
const MAX_VARIANTS = 100;
const MAX_GALLERY = 50;
const MAX_GALLERY_TITLE = 255;
const MAX_GALLERY_DESCRIPTION = 1000;

// An axis like "Size"; ids are null until saved
export interface ProductOption {
  id: bigint | null;
  name: string;
  values: {
    id: bigint | null;
    value: string;
  }[];
}

// What is actually sold
export interface VariantProps {
  id: bigint | null;
  sku: string | null;
  // Regular price; what it costs now is effectivePrice()
  listPrice: bigint;
  // null: not on sale. Applies inside the product's sale window.
  salePrice: bigint | null;
  // Stock only counts when trackStock; off keeps the number, ignored
  trackStock: boolean;
  stock: number;
  // Option name -> value, one entry per option
  values: Record<string, string>;
  deletedAt: string | null;
}

export interface ProductProps {
  id: bigint | null;
  categoryId: bigint | null;
  name: string;
  slug: string;
  // Short summary, at most 500 characters
  description: string;
  // Sanitized HTML (HtmlSanitizer) before it reaches the domain
  content: string;
  // One window for every variant's salePrice; a null bound is open
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  status: ProductStatus;
  options: ProductOption[];
  // Live and soft-deleted, in display order
  variants: VariantProps[];
  // Set once at creation; null for seeds and deleted users
  createdById: bigint | null;
  deletedAt: string | null;
}

// A variant as staff send it. With an id it edits that variant; without,
// it adds one. Variants left out of a list are deleted.
export interface VariantInput {
  id?: bigint;
  sku?: string | null;
  listPrice: bigint;
  salePrice?: bigint | null;
  trackStock?: boolean;
  stock?: number;
  values?: Record<string, string>;
}

export interface ProductInput {
  categoryId?: bigint | null;
  name?: string;
  slug?: string;
  description?: string;
  content?: string;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  status?: ProductStatus;
  // Replace the whole list (names and values in order)
  options?: {
    name: string;
    values: string[];
  }[];
  // Replace the whole list; needed whenever options change
  variants?: VariantInput[];
}

export class Product {
  private constructor(private props: ProductProps) {}

  static create(
    input: ProductInput & {
      name: string;
      slug: string;
      variants: VariantInput[];
    },
    createdById: bigint | null = null,
  ): Product {
    const product = new Product({
      id: null,
      categoryId: null,
      name: "",
      slug: "",
      description: "",
      content: "",
      saleStartsAt: null,
      saleEndsAt: null,
      status: "draft",
      options: [],
      variants: [],
      createdById,
      deletedAt: null,
    });
    product.update(input);
    return product;
  }

  static restore(props: ProductProps): Product {
    return new Product(props);
  }

  get id(): bigint | null {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get content(): string {
    return this.props.content;
  }

  update(input: ProductInput): void {
    const p = this.props;
    if (input.name !== undefined) {
      p.name = checkName(input.name);
    }
    if (input.slug !== undefined) {
      p.slug = checkSlug(input.slug);
    }
    if (input.description !== undefined) {
      const description = input.description.trim();
      if (description.length > 500) {
        throw new InvalidShopInputError(
          "Description is at most 500 characters",
        );
      }
      p.description = description;
    }
    if (input.content !== undefined) {
      p.content = input.content;
    }
    if (input.saleStartsAt !== undefined) {
      p.saleStartsAt = checkTime(input.saleStartsAt, "Sale start");
    }
    if (input.saleEndsAt !== undefined) {
      p.saleEndsAt = checkTime(input.saleEndsAt, "Sale end");
    }
    if (
      p.saleStartsAt &&
      p.saleEndsAt &&
      Date.parse(p.saleEndsAt) <= Date.parse(p.saleStartsAt)
    ) {
      throw new InvalidShopInputError("Sale must end after it starts");
    }
    if (input.categoryId !== undefined) {
      p.categoryId = input.categoryId;
    }
    if (input.status !== undefined) {
      p.status = input.status;
    }
    if (input.options !== undefined) {
      if (input.variants === undefined) {
        throw new InvalidShopInputError(
          "Send the variants together with the options",
        );
      }
      p.options = mergeOptions(p.options, input.options);
    }
    if (input.variants !== undefined) {
      p.variants = mergeVariants(p.variants, input.variants);
    }
    checkVariants(p);
  }

  liveVariants(): VariantProps[] {
    return this.props.variants.filter((v) => v.deletedAt === null);
  }

  // Cached on the product for listings and price sorts
  priceRange(): {
    minPrice: bigint;
    maxPrice: bigint;
  } {
    const prices = this.liveVariants().map((v) => v.listPrice);
    return {
      minPrice: prices.reduce((a, b) => (b < a ? b : a)),
      maxPrice: prices.reduce((a, b) => (b > a ? b : a)),
    };
  }

  delete(now: Date): void {
    this.props.deletedAt = now.toISOString();
  }

  assignId(id: bigint): void {
    this.props.id = id;
  }

  snapshot(): Readonly<ProductProps> {
    return this.props;
  }
}

// Keeps the ids of options and values whose names stay
function mergeOptions(
  current: ProductOption[],
  input: {
    name: string;
    values: string[];
  }[],
): ProductOption[] {
  if (input.length > MAX_OPTIONS) {
    throw new InvalidShopInputError(`At most ${MAX_OPTIONS} options`);
  }
  const names = new Set<string>();
  return input.map(({ name, values }) => {
    const n = checkLabel(name, "Option name");
    if (names.has(n.toLowerCase())) {
      throw new InvalidShopInputError(`Option ${n} is listed twice`);
    }
    names.add(n.toLowerCase());
    if (values.length === 0 || values.length > MAX_VALUES) {
      throw new InvalidShopInputError(
        `Option ${n} has 1 to ${MAX_VALUES} values`,
      );
    }
    const old = current.find((o) => o.name === n);
    const seen = new Set<string>();
    return {
      id: old?.id ?? null,
      name: n,
      values: values.map((raw) => {
        const value = checkLabel(raw, `A value of ${n}`);
        if (seen.has(value.toLowerCase())) {
          throw new InvalidShopInputError(`${n} ${value} is listed twice`);
        }
        seen.add(value.toLowerCase());
        return {
          id: old?.values.find((v) => v.value === value)?.id ?? null,
          value,
        };
      }),
    };
  });
}

// Listed variants are edited or added; live ones left out are soft-deleted
// (orders keep pointing at them)
function mergeVariants(
  current: VariantProps[],
  input: VariantInput[],
): VariantProps[] {
  if (input.length > MAX_VARIANTS) {
    throw new InvalidShopInputError(`At most ${MAX_VARIANTS} variants`);
  }
  const now = new Date().toISOString();
  const kept = new Set<bigint>();
  const next = input.map((v): VariantProps => {
    const old =
      v.id === undefined
        ? undefined
        : current.find((c) => c.id === v.id && c.deletedAt === null);
    if (v.id !== undefined && !old) {
      throw new InvalidShopInputError(`Variant ${v.id} is not on this product`);
    }
    if (old) {
      kept.add(old.id!);
    }
    const variant: VariantProps = {
      id: old?.id ?? null,
      sku: v.sku !== undefined ? checkSku(v.sku) : (old?.sku ?? null),
      listPrice: checkMoney(v.listPrice, "List price"),
      salePrice:
        v.salePrice !== undefined
          ? v.salePrice === null
            ? null
            : checkMoney(v.salePrice, "Sale price")
          : (old?.salePrice ?? null),
      trackStock: v.trackStock ?? old?.trackStock ?? false,
      stock: v.stock !== undefined ? checkStock(v.stock) : (old?.stock ?? 0),
      values: v.values ?? old?.values ?? {},
      deletedAt: null,
    };
    if (variant.salePrice !== null && variant.salePrice >= variant.listPrice) {
      throw new InvalidShopInputError(
        "Sale price must be lower than the list price",
      );
    }
    return variant;
  });
  const removed = current
    .filter((c) => c.deletedAt !== null || !kept.has(c.id!))
    .filter((c) => c.id !== null)
    .map((c) => ({
      ...c,
      deletedAt: c.deletedAt ?? now,
    }));
  return [
    ...next,
    ...removed,
  ];
}

// At least one live variant; each has one known value per option; no two
// share a combination (so without options there is exactly one)
function checkVariants(p: ProductProps): void {
  const live = p.variants.filter((v) => v.deletedAt === null);
  if (live.length === 0) {
    throw new InvalidShopInputError("A product has at least one variant");
  }
  const combos = new Set<string>();
  for (const v of live) {
    const keys = Object.keys(v.values);
    if (
      keys.length !== p.options.length ||
      keys.some((k) => !p.options.some((o) => o.name === k))
    ) {
      throw new InvalidShopInputError(
        p.options.length
          ? `Each variant has a value for ${p.options.map((o) => o.name).join(", ")}`
          : "Variants have no values without options",
      );
    }
    for (const o of p.options) {
      if (!o.values.some((x) => x.value === v.values[o.name])) {
        throw new InvalidShopInputError(
          `${v.values[o.name]} is not a value of ${o.name}`,
        );
      }
    }
    const combo = variantName(p.options, v.values);
    if (combos.has(combo)) {
      throw new InvalidShopInputError(
        combo ? `Two variants are ${combo}` : "Add options to sell variants",
      );
    }
    combos.add(combo);
  }
}

// "M / Red" in option order; '' without options
export function variantName(
  options: readonly {
    name: string;
  }[],
  values: Record<string, string>,
): string {
  return options.map((o) => values[o.name]).join(" / ");
}

type SaleFields = {
  listPrice: bigint;
  salePrice: bigint | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
};

export function isSaleActive(p: SaleFields, now: Date): boolean {
  if (p.salePrice === null) {
    return false;
  }
  const t = now.getTime();
  if (p.saleStartsAt && t < Date.parse(p.saleStartsAt)) {
    return false;
  }
  if (p.saleEndsAt && t >= Date.parse(p.saleEndsAt)) {
    return false;
  }
  return true;
}

export function effectivePrice(p: SaleFields, now: Date): bigint {
  return isSaleActive(p, now) ? (p.salePrice as bigint) : p.listPrice;
}

function checkLabel(value: string, label: string): string {
  const v = value.trim();
  if (!v || v.length > 64) {
    throw new InvalidShopInputError(`${label} is 1 to 64 characters`);
  }
  return v;
}

function checkSku(value: string | null): string | null {
  const sku = value?.trim() || null;
  if (sku && sku.length > 64) {
    throw new InvalidShopInputError("SKU is at most 64 characters");
  }
  return sku;
}

function checkStock(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidShopInputError("Stock is a whole number, 0 or more");
  }
  return value;
}

function checkTime(value: string | null, label: string): string | null {
  if (value === null) {
    return null;
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new InvalidShopInputError(`${label} is not a valid time`);
  }
  return new Date(ms).toISOString();
}

// Variant and option value images (ideas/orders/products.md "Images"):
// staff pick them from the product's own photos, so a variant can't show
// an unrelated file. `isPhoto` tells whether an asset is one of them.
export function checkVariantImages(
  p: Readonly<ProductProps>,
  images: {
    variants?: ReadonlyMap<bigint, bigint | null>;
    optionValues?: readonly {
      option: string;
      value: string;
      image: bigint | null;
    }[];
  },
  isPhoto: (assetId: bigint) => boolean,
): void {
  for (const [variantId, image] of images.variants ?? []) {
    if (!p.variants.some((v) => v.id === variantId && v.deletedAt === null)) {
      throw new InvalidVariantImageError(
        `Variant ${variantId} is not on this product`,
      );
    }
    if (image !== null && !isPhoto(image)) {
      throw new InvalidVariantImageError(
        "Pick the image from the product's photos",
      );
    }
  }
  for (const v of images.optionValues ?? []) {
    if (!optionValueId(p, v.option, v.value)) {
      throw new InvalidVariantImageError(`${v.option} has no value ${v.value}`);
    }
    if (v.image !== null && !isPhoto(v.image)) {
      throw new InvalidVariantImageError(
        "Pick the image from the product's photos",
      );
    }
  }
}

export function optionValueId(
  p: Readonly<ProductProps>,
  option: string,
  value: string,
): bigint | null {
  return (
    p.options
      .find((o) => o.name === option)
      ?.values.find((v) => v.value === value)?.id ?? null
  );
}

// Ids that can hold an image: live variants and option values
export function imageOwnerIds(p: Readonly<ProductProps>): {
  variants: bigint[];
  optionValues: bigint[];
} {
  return {
    variants: p.variants
      .filter((v) => v.deletedAt === null && v.id !== null)
      .map((v) => v.id!),
    optionValues: p.options.flatMap((o) =>
      o.values.filter((v) => v.id !== null).map((v) => v.id!),
    ),
  };
}

// A gallery image with its own caption; blank text is stored as null
export interface GalleryItem {
  assetId: bigint;
  title: string | null;
  description: string | null;
}

// The whole gallery, in order: each image once, captions trimmed
export function checkGallery(
  items: readonly {
    assetId: bigint;
    title?: string | null;
    description?: string | null;
  }[],
): GalleryItem[] {
  if (items.length > MAX_GALLERY) {
    throw new InvalidShopInputError(
      `A gallery has at most ${MAX_GALLERY} images`,
    );
  }
  const seen = new Set<bigint>();
  return items.map((item) => {
    if (seen.has(item.assetId)) {
      throw new InvalidShopInputError(
        `Image ${item.assetId} is in the gallery twice`,
      );
    }
    seen.add(item.assetId);
    return {
      assetId: item.assetId,
      title: caption(item.title, MAX_GALLERY_TITLE, "A gallery title"),
      description: caption(
        item.description,
        MAX_GALLERY_DESCRIPTION,
        "A gallery description",
      ),
    };
  });
}

function caption(
  text: string | null | undefined,
  max: number,
  label: string,
): string | null {
  const trimmed = text?.trim() ?? "";
  if (trimmed.length > max) {
    throw new InvalidShopInputError(`${label} is at most ${max} characters`);
  }
  return trimmed === "" ? null : trimmed;
}
