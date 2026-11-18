// Shapes the api returns, as apps/web/src/lib/api.ts has them. File URLs
// (avatarUrl, url, coverUrl...) are ready to use as they are.

// Shapes the api returns (see the api's UserView / TokenPair)
export type User = {
  id: string;
  email: string;
  displayName: string;
  shortName: string | null;
  // Ready to use as is
  avatarUrl: string | null;
  // A built-in key or a custom role's
  role: string;
  status: "active" | "disabled";
  givenName?: string | null;
  familyName?: string | null;
  createdAt?: string;
};

// One setting from GET /configs (admin)
// 'mail': `driver` picks the fields. The api never sends secrets back
// (`password`, `apiKey` come back empty; see ConfigEntry.secretsSet).
type MailFrom = {
  fromName: string;
  fromEmail: string;
};
export type MailSettings =
  | (MailFrom & {
      driver: "smtp";
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password: string;
    })
  | (MailFrom & {
      driver: "resend";
      apiKey: string;
    })
  | (MailFrom & {
      driver: "log";
    });
export type MailDriver = MailSettings["driver"];
export type ConfigValue = string | number | string[] | MailSettings | null;
export type ConfigEntry = {
  key: string;
  label: string;
  // Secret fields come back empty; `secretsSet` names those holding a value
  value: ConfigValue;
  secretsSet: string[];
  default: ConfigValue;
  // false: no row, the value is the default
  isSet: boolean;
  public: boolean;
  updatedAt: string | null;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
};

// The api's storage views
export type {
  Asset,
  AssetListing,
  FolderOption,
} from "@packages/contracts";

export type PostStatus = "draft" | "scheduled" | "published";

// A tag on a post; its page is /tags/<slug>
export type TagRef = {
  name: string;
  slug: string;
};

// A tag in the panel (GET /posts/tags)
export type PostTag = TagRef & {
  id: string;
  postCount: number;
};

// GET /public/posts/tags: tags with live posts, by name
export type PublicTag = TagRef & {
  postCount: number;
};

export type PostSummary = {
  id: string;
  parentId: string | null;
  authorId: string | null;
  title: string;
  slug: string | null;
  // null: no URL yet (no slug here or above)
  path: string | null;
  description: string | null;
  tags: TagRef[];
  status: PostStatus;
  publishedAt: string | null;
  // On the site now (published, or scheduled and due)
  live: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Post = PostSummary & {
  content: string;
  cover: {
    assetId: string;
    url: string | null;
  } | null;
  // Text in the non-default locales (ideas/i18n)
  translations: PostTranslation[];
};

export type PostTranslation = {
  // Locale code, e.g. "vi-VN"
  locale: string;
  title: string;
  // null: the post's own slug
  slug: string | null;
  // The path in this locale; null while not reachable
  path: string | null;
  content: string;
  description: string | null;
  updatedAt: string;
};

export type PostOption = {
  id: string;
  title: string;
  path: string | null;
};

export type PublicPost = {
  title: string;
  path: string;
  content: string;
  description: string | null;
  tags: TagRef[];
  publishedAt: string;
  coverUrl: string | null;
  // The locale of this text: the requested one, or the default when the
  // post has no translation in it (ideas/i18n)
  locale: string;
  // Every locale's path, default first (single-post reads only)
  alternates?: {
    locale: string;
    path: string;
  }[];
};

// Shop (ideas/orders). Money is minor units as a string, e.g. "1999" = 19.99
export type Category = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  position: number;
};

// An entry of the address pick list (staff manage it at /regions)
export type Region = {
  id: string;
  countryCode: string;
  parentId: string | null;
  code: string;
  name: string;
  position: number;
  active: boolean;
};

// Prices are stored in the base currency (config shop.currency); 1 base =
// rate of this one (decimal text). Staff manage them at /currencies.
export type Currency = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  rate: string;
  rateAt: string;
  active: boolean;
  position: number;
  isBase: boolean;
};

export type Currencies = {
  base: string;
  items: Currency[];
};

// Staff manage them at /locales; exactly one is the default
export type Locale = {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  active: boolean;
  isDefault: boolean;
  position: number;
};

export type ProductStatus = "draft" | "active" | "archived";

// A file attached to a product, a variant or an option value
export type AttachedAsset = {
  assetId: string;
  url: string;
};

// One buyable version of a product (ideas/orders/products.md): the price,
// SKU and stock live here. A product without options has exactly one.
export type ProductVariant = {
  id: string;
  sku: string | null;
  // Option name -> value; {} without options
  values: Record<string, string>;
  // "M / Red"; "" without options
  name: string;
  // Regular price
  listPrice: string;
  // The sale price while the product's sale window is open now, else null
  salePrice: string | null;
  // What it costs now: salePrice ?? listPrice
  price: string;
  // The sale price as set, even outside the window (staff endpoints only)
  sale?: string | null;
  trackStock: boolean;
  // Staff: always the count; public shop: null unless tracked
  stock: number | null;
  // Untracked variants are always in stock
  inStock: boolean;
  // Its own image, as staff picked it
  image: AttachedAsset | null;
  // What to show: its own image, else an option value's, else the cover
  imageUrl: string | null;
};

export type ProductOption = {
  name: string;
  values: string[];
  // Value -> its image; values without one are left out
  images: Record<string, AttachedAsset>;
};

// A gallery image with its caption
export type GalleryItem = AttachedAsset & {
  title: string | null;
  description: string | null;
};

export type Product = {
  id: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string;
  // Sanitized HTML; detail endpoints only
  content?: string;
  // Lowest and highest price now among the variants
  priceMin: string;
  priceMax: string;
  // The sale window as set, for every variant (staff endpoints only)
  sale?: {
    startsAt: string | null;
    endsAt: string | null;
  };
  // Some variant is in stock
  inStock: boolean;
  // At most 3; [] for a product with a single variant
  options: ProductOption[];
  variants: ProductVariant[];
  status: ProductStatus;
  rating: {
    count: number;
    average: number | null;
  };
  cover: AttachedAsset | null;
  gallery: GalleryItem[];
  createdAt: string;
  updatedAt: string;
};

// A line in the signed-in customer's cart, priced now (ideas/orders/cart.md)
export type CartLine = {
  variantId: string;
  quantity: number;
  // null once the product is deleted
  product: {
    id: string;
    name: string;
    slug: string;
  } | null;
  // null once the variant is deleted
  variant: ProductVariant | null;
  // Can be ordered as is: on sale and enough in stock
  available: boolean;
  // Why not, for the customer
  problem: string | null;
  // price * quantity, minor units; "0" when unavailable
  lineTotal: string;
};

export type Cart = {
  items: CartLine[];
  // Units across all lines
  count: number;
  // Available lines, before shipping, tax and coupons
  subtotal: string;
};

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

export type OrderSummary = {
  id: string;
  userId: string | null;
  status: OrderStatus;
  paymentMethod: "cod" | "bank_transfer";
  paymentStatus: PaymentStatus;
  currency: string;
  total: string;
  itemCount: number;
  recipientName: string;
  createdAt: string;
};

export type ShippingAddress = {
  label?: string | null;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  // ISO 3166-2 ('VN-HN'); region holds its name (or a typed one)
  regionCode?: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
};

// Who pays, for the invoice: an address plus optional company details
export type BillingAddress = ShippingAddress & {
  company: string | null;
  taxCode: string | null;
};

// GET /me/addresses
export type SavedAddress = ShippingAddress & {
  id: string;
  isDefault: boolean;
};

export type Order = Omit<OrderSummary, "itemCount" | "recipientName"> & {
  subtotal: string;
  shippingFee: string;
  tax: string;
  shippingAddress: ShippingAddress;
  // Null: bill the shipping address (no company details)
  billingAddress: BillingAddress | null;
  trackingNumber: string | null;
  paidAt: string | null;
  note: string | null;
  updatedAt: string;
  items: {
    productId: string | null;
    variantId: string | null;
    name: string;
    // "M / Red"; "" for a product without options
    variantName: string;
    sku: string | null;
    // Regular price at checkout; above unitPrice when it was on sale
    listPrice: string;
    unitPrice: string;
    quantity: number;
    lineTotal: string;
  }[];
  events: {
    type: "placed" | "status_changed" | "payment_changed";
    data: {
      from?: string;
      to?: string;
      trackingNumber?: string;
    };
    actorId: string | null;
    createdAt: string;
  }[];
};

export type Role = string;

// GET /roles (needs user:manage)
export type RoleView = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  // Built-in: can't be edited or deleted
  system: boolean;
  permissions: string[];
  users: number;
};
// GET /users/permissions: what each role may do
export type Permissions = {
  roles: Role[];
  permissions: {
    key: string;
    group: string;
    label: string;
    roles: Role[];
  }[];
};

// Pages (ideas/pages): built from blocks, framed by a shared layout
export type BlockType =
  | "richText"
  | "hero"
  | "image"
  | "gallery"
  | "productGrid"
  | "postList"
  | "contactForm"
  | "faq"
  | "columns";

export type Block = {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
};

export type PageStatus = "draft" | "scheduled" | "published";

export type PageSummary = {
  id: string;
  parentId: string | null;
  layoutId: string | null;
  title: string;
  slug: string | null;
  path: string | null;
  status: PageStatus;
  publishedAt: string | null;
  live: boolean;
  showInMenu: boolean;
  menuOrder: number;
  updatedAt: string;
};

// `settings` as stored: { version, layout, <options>, blocks }
export type Page = PageSummary & {
  description: string | null;
  settings: PageSettings;
  createdAt: string;
};

export type LayoutOverrides = Partial<
  Pick<LayoutFields, "width" | "header" | "footer" | "background" | "spacing">
>;

export type PageSettings = {
  version?: number;
  layout?: LayoutOverrides;
  showTitle?: boolean;
  "seo.title"?: string | null;
  "seo.imageKey"?: string | null;
  "seo.noindex"?: boolean;
  "cache.revalidate"?: number;
  blocks: Block[];
};

export type LayoutFields = {
  template: "default" | "landing" | "sidebar" | "blank";
  width: "narrow" | "wide" | "full";
  header: "default" | "transparent" | "minimal" | "none";
  footer: "default" | "minimal" | "none";
  background: "default" | "muted" | "primary";
  spacing: "compact" | "normal" | "relaxed";
  sidebar: {
    side: "left" | "right";
    sticky: boolean;
    blocks: Block[];
  } | null;
};

export type PageLayout = {
  id: string;
  name: string;
  isDefault: boolean;
  settings: Partial<LayoutFields> & {
    version?: number;
  };
  pageCount: number;
  updatedAt: string;
};

export type PublicPage = {
  id: string;
  title: string;
  path: string;
  description: string | null;
  publishedAt: string;
  layout: LayoutFields;
  options: {
    showTitle: boolean;
    "seo.title": string | null;
    "seo.imageKey": string | null;
    "seo.noindex": boolean;
    "cache.revalidate": number;
  };
  blocks: Block[];
};

export type MenuItem = {
  title: string;
  path: string;
  children: MenuItem[];
};

// Contact inbox (ideas/contact)
export type ContactMessageStatus =
  | "new"
  | "read"
  | "replied"
  | "spam"
  | "archived";

export interface ContactMessage {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string | null;
  // "html": sanitized HTML (added in the panel); "text": as the visitor typed
  messageFormat: "text" | "html";
  status: ContactMessageStatus;
  // When the mail was queued; null: mail off or failed
  mailedAt: string | null;
  createdAt: string;
}

export interface ContactMessageDetail extends ContactMessage {
  ip: string | null;
  userAgent: string | null;
}
