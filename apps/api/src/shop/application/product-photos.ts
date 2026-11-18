import type { QueryBus } from "@nestjs/cqrs";
import { GetAssetQuery } from "../../storage/application/queries/get-asset.query.js";
import { GetAssetUsagesQuery } from "../../storage/application/queries/get-asset-usages.query.js";

// The product's photos: its cover, its gallery and the files directly in
// its media folder. Variant and option value images must be one of them.
export interface ProductPhotos {
  isPhoto(assetId: bigint): boolean;
  // Variant and option value images that are no longer photos
  staleImages(): {
    ownerType: string;
    ownerId: bigint;
  }[];
}

export async function loadProductPhotos(
  queries: QueryBus,
  productId: bigint,
  // Asset ids in the gallery (ProductGalleryItem)
  gallery: bigint[],
  owners: {
    variants: bigint[];
    optionValues: bigint[];
  },
  // Assets about to be picked, besides the current images
  candidates: bigint[],
  viewerId: bigint,
): Promise<ProductPhotos> {
  const ids = [
    productId,
  ];
  const [cover, folder, variantImages, valueImages] = await Promise.all([
    queries.execute(new GetAssetUsagesQuery("product", ids, "cover")),
    queries.execute(new GetAssetUsagesQuery("product", ids, "folder")),
    queries.execute(
      new GetAssetUsagesQuery("product_variant", owners.variants, "image"),
    ),
    queries.execute(
      new GetAssetUsagesQuery(
        "product_option_value",
        owners.optionValues,
        "image",
      ),
    ),
  ]);
  const attached = new Set([
    ...(cover.get(String(productId)) ?? []).map((a) => a.assetId),
    ...gallery.map(String),
  ]);
  const folderId = folder.get(String(productId))?.[0]?.assetId ?? null;
  const current = [
    ...[
      ...variantImages,
    ].map(([id, a]) => ({
      ownerType: "product_variant",
      ownerId: BigInt(id),
      assetId: a[0]?.assetId,
    })),
    ...[
      ...valueImages,
    ].map(([id, a]) => ({
      ownerType: "product_option_value",
      ownerId: BigInt(id),
      assetId: a[0]?.assetId,
    })),
  ].filter(
    (
      c,
    ): c is typeof c & {
      assetId: string;
    } => c.assetId !== undefined,
  );
  // Others count when they sit in the product's folder
  const inFolder = new Set<string>();
  if (folderId !== null) {
    const rest = new Set(
      [
        ...candidates.map(String),
        ...current.map((c) => c.assetId),
      ].filter((id) => !attached.has(id)),
    );
    await Promise.all(
      [
        ...rest,
      ].map(async (id) => {
        const asset = await queries.execute(
          new GetAssetQuery(
            {
              id: BigInt(id),
            },
            viewerId,
          ),
        );
        if (asset?.parentId === folderId) {
          inFolder.add(id);
        }
      }),
    );
  }
  const isPhoto = (id: string) => attached.has(id) || inFolder.has(id);
  return {
    isPhoto: (assetId) => isPhoto(String(assetId)),
    staleImages: () =>
      current
        .filter((c) => !isPhoto(c.assetId))
        .map(({ ownerType, ownerId }) => ({
          ownerType,
          ownerId,
        })),
  };
}
