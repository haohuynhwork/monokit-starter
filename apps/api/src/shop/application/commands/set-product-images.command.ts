import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/shop.js";

// cover: an asset id or null to remove it (undefined keeps it);
// gallery: the full ordered list, each image with its caption (undefined
// keeps it);
// variants: variant id -> its own image (null removes), only those listed
// change; optionValues: the same per option value, e.g. Color: Red
export interface ProductImages {
  cover?: bigint | null;
  gallery?: {
    assetId: bigint;
    title?: string | null;
    description?: string | null;
  }[];
  variants?: Map<bigint, bigint | null>;
  optionValues?: {
    option: string;
    value: string;
    image: bigint | null;
  }[];
}

export class SetProductImagesCommand extends Command<void> {
  constructor(
    readonly productId: bigint,
    readonly images: ProductImages,
    readonly actor: Actor,
  ) {
    super();
  }
}
