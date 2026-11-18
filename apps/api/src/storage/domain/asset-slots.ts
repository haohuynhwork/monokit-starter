import { InvalidAssetSlotError } from "./asset.errors.js";

// Which slots each owner type may use (ideas/storage "Asset usages").
// Single slots hold at most one asset per owner: attaching replaces the
// previous one. Only the domain enforces this (the repository's attach with
// single: true); the database has no index for it.
//
// A new model with files (e.g. 'product') adds its slots here, including
// 'folder', and exposes POST /<models>/:id/folder that checks its own
// permissions and runs EnsureEntityFolderCommand.
// 'folder' (any owner that has files): the owner's own folder in the media
// library, created by EnsureEntityFolderCommand. Pickers and uploads for the
// owner use it.
export const ASSET_SLOTS = {
  user: {
    avatar: {
      single: true,
    },
  },
  post: {
    folder: {
      single: true,
    },
    cover: {
      single: true,
    },
    gallery: {
      single: false,
    },
    download: {
      single: false,
    },
    inline: {
      single: false,
    },
  },
  // Files shown by a page's blocks (ideas/pages "Files")
  page: {
    inline: {
      single: false,
    },
  },
  // Files in a layout's sidebar blocks
  page_layout: {
    inline: {
      single: false,
    },
  },
  // The gallery is shop's own ProductGalleryItem table (captions per image)
  product: {
    folder: {
      single: true,
    },
    cover: {
      single: true,
    },
    inline: {
      single: false,
    },
  },
  // One image each, picked from the product's photos (ideas/orders/products.md)
  product_variant: {
    image: {
      single: true,
    },
  },
  product_option_value: {
    image: {
      single: true,
    },
  },
} as const satisfies Record<
  string,
  Record<
    string,
    {
      single: boolean;
    }
  >
>;

export type OwnerType = keyof typeof ASSET_SLOTS;

export function checkAssetSlot(
  ownerType: string,
  slot: string,
): {
  single: boolean;
} {
  const slots = (
    ASSET_SLOTS as Record<
      string,
      Record<
        string,
        {
          single: boolean;
        }
      >
    >
  )[ownerType];
  const spec = slots?.[slot];
  if (!spec) {
    throw new InvalidAssetSlotError(ownerType, slot);
  }
  return spec;
}
