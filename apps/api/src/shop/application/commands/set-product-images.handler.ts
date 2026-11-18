import { Inject } from "@nestjs/common";
import {
  CommandBus,
  CommandHandler,
  type ICommandHandler,
  QueryBus,
} from "@nestjs/cqrs";
import { AttachAssetCommand } from "../../../storage/application/commands/attach-asset.command.js";
import { DetachAssetsCommand } from "../../../storage/application/commands/detach-assets.command.js";
import {
  checkGallery,
  checkVariantImages,
  imageOwnerIds,
  optionValueId,
} from "../../domain/product.js";
import { ProductNotFoundError } from "../../domain/shop.errors.js";
import { checkCanEditProduct, checkStaff } from "../../domain/shop.js";
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from "../../domain/shop.repository.js";
import { loadProductPhotos } from "../product-photos.js";
import { SetProductImagesCommand } from "./set-product-images.command.js";

// Images stay in the media library when removed
@CommandHandler(SetProductImagesCommand)
export class SetProductImagesHandler
  implements ICommandHandler<SetProductImagesCommand>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  async execute({
    productId,
    images,
    actor,
  }: SetProductImagesCommand): Promise<void> {
    checkStaff(actor);
    const product = await this.products.findById(productId);
    if (!product) {
      throw new ProductNotFoundError();
    }
    checkCanEditProduct(actor, product.snapshot());
    const p = product.snapshot();
    const gallery =
      images.gallery === undefined ? undefined : checkGallery(images.gallery);
    if (images.cover !== undefined) {
      await this.commands.execute(
        images.cover === null
          ? new DetachAssetsCommand("product", productId, "cover")
          : new AttachAssetCommand("product", productId, "cover", images.cover),
      );
    }
    if (gallery !== undefined) {
      await this.products.replaceGallery(productId, gallery);
    }
    // Checked against the photos after the cover/gallery change, so one
    // request can add a gallery image and give it to a variant
    const photos = await loadProductPhotos(
      this.queries,
      productId,
      (await this.products.findGallery(productId)).map((g) => g.assetId),
      imageOwnerIds(p),
      [
        ...(images.variants?.values() ?? []),
        ...(images.optionValues ?? []).map((v) => v.image),
      ].filter((id) => id !== null),
      actor.id,
    );
    checkVariantImages(p, images, (id) => photos.isPhoto(id));
    for (const [variantId, image] of images.variants ?? []) {
      await this.setImage("product_variant", variantId, image);
    }
    for (const v of images.optionValues ?? []) {
      await this.setImage(
        "product_option_value",
        optionValueId(p, v.option, v.value)!,
        v.image,
      );
    }
    // A photo removed from the product leaves the variants that showed it
    if (images.cover !== undefined || gallery !== undefined) {
      for (const stale of photos.staleImages()) {
        await this.commands.execute(
          new DetachAssetsCommand(stale.ownerType, stale.ownerId, "image"),
        );
      }
    }
  }

  private async setImage(
    ownerType: string,
    ownerId: bigint,
    image: bigint | null,
  ): Promise<void> {
    await this.commands.execute(
      image === null
        ? new DetachAssetsCommand(ownerType, ownerId, "image")
        : new AttachAssetCommand(ownerType, ownerId, "image", image),
    );
  }
}
