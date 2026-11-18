import { call } from "@/lib/admin/call";
import { api } from "@/lib/api";
import { toMinor } from "@/lib/money";
import { fetchShopCurrency, type ShopActionState } from "@/lib/shop";
import type { Asset, Product } from "@/lib/types";
import { linkName } from "@/lib/url";

// Client versions of the web panel's server actions. Nothing is reloaded
// here; callers run `router.invalidate()` (or navigate) after a success.

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "").trim();

type VariantInput = {
  id?: string;
  name: string;
  values: Record<string, string>;
  sku: string;
  listPrice: string;
  salePrice: string;
  trackStock: boolean;
  stock: number;
};

const parseJson = <T>(formData: FormData, name: string, fallback: T): T => {
  try {
    return JSON.parse(String(formData.get(name) ?? "")) as T;
  } catch {
    return fallback;
  }
};

// The editor form; creates when there's no id (the editor then opens the
// new product: its id is in `data`).
// Options and variants come from the variants editor as JSON; the api takes
// both whole lists (variants left out are removed).
export async function saveProduct(formData: FormData): Promise<
  ShopActionState & {
    data?: Product;
  }
> {
  const id = field(formData, "id");
  const currency = await fetchShopCurrency();
  const options = parseJson<
    {
      name: string;
      values: string[];
    }[]
  >(formData, "options", []);
  const drafts = parseJson<VariantInput[]>(formData, "variants", []);
  // Checked before any request; keys match the api's issue paths
  const fieldErrors: Record<string, string> = {};
  const name = field(formData, "name");
  const slug = field(formData, "slug");
  if (!name) {
    fieldErrors.name = "Enter a name.";
  } else if (name.length > 255) {
    fieldErrors.name = "Use at most 255 characters.";
  }
  if (!slug) {
    fieldErrors.slug = "Enter a slug.";
  } else if (slug.length > 255) {
    fieldErrors.slug = "Use at most 255 characters.";
  } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug.toLowerCase())) {
    fieldErrors.slug = "Use lowercase letters, digits and dashes.";
  }
  if (field(formData, "description").length > 500) {
    fieldErrors.description = "Use at most 500 characters.";
  }
  const saleStartsAt = field(formData, "saleStartsAt");
  const saleEndsAt = field(formData, "saleEndsAt");
  if (
    saleStartsAt &&
    saleEndsAt &&
    new Date(saleEndsAt).getTime() <= new Date(saleStartsAt).getTime()
  ) {
    fieldErrors.saleEndsAt = "End the sale after it starts.";
  }
  options.forEach((o, i) => {
    if (o.name.length > 64) {
      fieldErrors[`options.${i}`] = "Use at most 64 characters for the name.";
    } else if (o.values.some((v) => v.length > 64)) {
      fieldErrors[`options.${i}`] = "Use at most 64 characters per value.";
    } else if (o.values.length > 50) {
      fieldErrors[`options.${i}`] = "Use at most 50 values.";
    }
  });
  if (!drafts.length) {
    fieldErrors.variants = "Add at least one variant.";
  } else if (drafts.length > 100) {
    fieldErrors.variants = "Use at most 100 variants.";
  }
  const variants = [];
  const skus = new Set<string>();
  for (const [i, v] of drafts.entries()) {
    const sku = v.sku.trim();
    if (sku.length > 64) {
      fieldErrors[`variants.${i}.sku`] = "Use at most 64 characters.";
    } else if (sku && skus.has(sku)) {
      fieldErrors[`variants.${i}.sku`] = "Another variant has this SKU.";
    }
    skus.add(sku);
    const listPrice = toMinor(v.listPrice, currency);
    if (listPrice === null) {
      fieldErrors[`variants.${i}.listPrice`] =
        "Enter a valid price, e.g. 19.99.";
    }
    const salePrice =
      v.salePrice.trim() === "" ? null : toMinor(v.salePrice, currency);
    if (v.salePrice.trim() !== "" && salePrice === null) {
      fieldErrors[`variants.${i}.salePrice`] =
        "Enter a valid price, or leave it blank.";
    }
    variants.push({
      ...(v.id && {
        id: v.id,
      }),
      sku: sku || null,
      listPrice,
      salePrice,
      trackStock: v.trackStock,
      stock: v.stock,
      ...(options.length > 0 && {
        values: v.values,
      }),
    });
  }
  if (Object.keys(fieldErrors).length) {
    return {
      fieldErrors,
    };
  }
  const codeFields = {
    product_slug_taken: "slug",
    category_not_found: "categoryId",
    sku_taken: "variants",
  };
  const body = {
    name,
    slug,
    categoryId: field(formData, "categoryId") || null,
    // ISO times from the editor (converted in the browser's time zone);
    // the window applies to every variant's sale price
    saleStartsAt: saleStartsAt || null,
    saleEndsAt: saleEndsAt || null,
    status: field(formData, "status") || "draft",
    description: field(formData, "description"),
    content: String(formData.get("content") ?? ""),
    options,
    variants,
  };
  if (!id) {
    return call<Product>(
      "/products",
      {
        method: "POST",
        body,
      },
      "Product created.",
      codeFields,
    );
  }
  return call<Product>(
    `/products/${id}`,
    {
      method: "PATCH",
      body,
    },
    "Saved.",
    codeFields,
  );
}

export async function setProductStatus(
  id: string,
  status: Product["status"],
): Promise<ShopActionState> {
  return call(
    `/products/${id}`,
    {
      method: "PATCH",
      body: {
        status,
      },
    },
    "Status changed.",
  );
}

export async function deleteProduct(id: string): Promise<ShopActionState> {
  return call(
    `/products/${id}`,
    {
      method: "DELETE",
    },
    "Product deleted.",
  );
}

export async function setProductCover(
  id: string,
  assetId: string | null,
): Promise<ShopActionState> {
  return call(
    `/products/${id}/images`,
    {
      method: "PUT",
      body: {
        cover: assetId,
      },
    },
    assetId ? "Cover set." : "Cover removed.",
  );
}

// Replaces the whole gallery, in this order, with each image's caption;
// [] clears it
export async function setProductGallery(
  id: string,
  items: {
    assetId: string;
    title: string | null;
    description: string | null;
  }[],
): Promise<ShopActionState> {
  return call(
    `/products/${id}/images`,
    {
      method: "PUT",
      body: {
        gallery: items,
      },
    },
    "Gallery saved.",
  );
}

// A variant's own image; null removes it
export async function setVariantImage(
  id: string,
  variantId: string,
  assetId: string | null,
): Promise<ShopActionState> {
  return call(
    `/products/${id}/images`,
    {
      method: "PUT",
      body: {
        variants: {
          [variantId]: assetId,
        },
      },
    },
    assetId ? "Variant image set." : "Variant image removed.",
  );
}

// The image of every variant with this value, e.g. Color: Red
export async function setOptionValueImage(
  id: string,
  option: string,
  value: string,
  assetId: string | null,
): Promise<ShopActionState> {
  return call(
    `/products/${id}/images`,
    {
      method: "PUT",
      body: {
        optionValues: [
          {
            option,
            value,
            image: assetId,
          },
        ],
      },
    },
    assetId ? `Image set for ${value}.` : `Image removed from ${value}.`,
  );
}

// The product's own folder in the media library, for the picker's scope
export async function ensureProductFolder(id: string): Promise<{
  folderId?: string;
  message?: string;
}> {
  const res = await call<{
    folderId: string;
  }>(
    `/products/${id}/folder`,
    {
      method: "POST",
    },
    "",
  );
  return res.data?.folderId
    ? {
        folderId: res.data.folderId,
      }
    : {
        message: res.message,
      };
}

// TinyMCE's image uploads (paste, drop, the image dialog): a public file in
// the product's folder. Returns the 'serve/<key>' reference the
// content stores (relative to the site's base URL); saving
// the product attaches it as 'inline'. No refresh, so the editor keeps its
// unsaved text.
export async function uploadProductImage(formData: FormData): Promise<{
  url?: string;
  message?: string;
}> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return {
      message: "No file.",
    };
  }
  const folder = await ensureProductFolder(field(formData, "productId"));
  if (!folder.folderId) {
    return {
      message: folder.message,
    };
  }
  const body = new FormData();
  body.set("file", file, file.name);
  body.set("visibility", "public");
  body.set("parentId", folder.folderId);
  const res = await api<Asset>("/assets", {
    method: "POST",
    body,
  });
  return res.status === "success" && res.data?.url
    ? {
        url: `serve/${res.data.key}`,
      }
    : {
        message: res.message ?? "Upload failed.",
      };
}

// A cover or gallery image chosen on its card: a public file in the
// product's folder
export async function uploadProductPhoto(
  productId: string,
  file: File,
): Promise<{
  asset?: {
    id: string;
    url: string;
  };
  message?: string;
}> {
  const folder = await ensureProductFolder(productId);
  if (!folder.folderId) {
    return {
      message: folder.message,
    };
  }
  const body = new FormData();
  body.set("file", file, file.name);
  body.set("visibility", "public");
  body.set("parentId", folder.folderId);
  const res = await api<Asset>("/assets", {
    method: "POST",
    body,
  });
  return res.status === "success" && res.data?.url
    ? {
        asset: {
          id: res.data.id,
          url: res.data.url,
        },
      }
    : {
        message: res.message ?? "Upload failed.",
      };
}

// An image hosted elsewhere: a link asset in the product's folder (nothing
// is downloaded)
export async function addProductPhotoLink(
  productId: string,
  url: string,
): Promise<{
  asset?: {
    id: string;
    url: string;
  };
  message?: string;
}> {
  const clean = url.trim();
  if (
    !/^https?:\/\/\S+$/i.test(clean) ||
    !URL.canParse(clean) ||
    clean.length > 2048
  ) {
    return {
      message: "Enter an http or https URL.",
    };
  }
  const folder = await ensureProductFolder(productId);
  if (!folder.folderId) {
    return {
      message: folder.message,
    };
  }
  const res = await api<Asset>("/assets/links", {
    method: "POST",
    body: {
      parentId: folder.folderId,
      name: linkName(clean),
      url: clean,
    },
  });
  return res.status === "success" && res.data
    ? {
        asset: {
          id: res.data.id,
          url: res.data.url ?? clean,
        },
      }
    : {
        message: res.message ?? "Couldn't add the link.",
      };
}
