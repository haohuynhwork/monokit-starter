import { Module } from "@nestjs/common";
import { HTML_SANITIZER } from "../common/domain/html.js";
import { SanitizeHtmlSanitizer } from "../common/infrastructure/sanitize-html.sanitizer.js";
import { AddToCartHandler } from "./application/commands/add-to-cart.handler.js";
import { AddToWishlistHandler } from "./application/commands/add-to-wishlist.handler.js";
import { CancelMyOrderHandler } from "./application/commands/cancel-my-order.handler.js";
import { ChangeOrderPaymentHandler } from "./application/commands/change-order-payment.handler.js";
import { ChangeOrderStatusHandler } from "./application/commands/change-order-status.handler.js";
import { CreateCategoryHandler } from "./application/commands/create-category.handler.js";
import { CreateProductHandler } from "./application/commands/create-product.handler.js";
import { DeleteAddressHandler } from "./application/commands/delete-address.handler.js";
import { DeleteCategoryHandler } from "./application/commands/delete-category.handler.js";
import { DeleteProductHandler } from "./application/commands/delete-product.handler.js";
import { DeleteRatingHandler } from "./application/commands/delete-rating.handler.js";
import { EnsureProductFolderHandler } from "./application/commands/ensure-product-folder.handler.js";
import { MergeCartHandler } from "./application/commands/merge-cart.handler.js";
import { MergeWishlistHandler } from "./application/commands/merge-wishlist.handler.js";
import { PlaceOrderHandler } from "./application/commands/place-order.handler.js";
import { RateProductHandler } from "./application/commands/rate-product.handler.js";
import { RemoveFromCartHandler } from "./application/commands/remove-from-cart.handler.js";
import { RemoveFromWishlistHandler } from "./application/commands/remove-from-wishlist.handler.js";
import { SaveAddressHandler } from "./application/commands/save-address.handler.js";
import { SetCartQuantityHandler } from "./application/commands/set-cart-quantity.handler.js";
import { SetProductImagesHandler } from "./application/commands/set-product-images.handler.js";
import { UpdateCategoryHandler } from "./application/commands/update-category.handler.js";
import { UpdateProductHandler } from "./application/commands/update-product.handler.js";
import { ClearOrderedFromCart } from "./application/events/order-placed.handler.js";
import { CanAccessProductHandler } from "./application/queries/can-access-product.handler.js";
import { GetCartHandler } from "./application/queries/get-cart.handler.js";
import { GetOrderHandler } from "./application/queries/get-order.handler.js";
import { GetProductHandler } from "./application/queries/get-product.handler.js";
import { ListAddressesHandler } from "./application/queries/list-addresses.handler.js";
import { ListCategoriesHandler } from "./application/queries/list-categories.handler.js";
import { ListGuestWishlistHandler } from "./application/queries/list-guest-wishlist.handler.js";
import { ListOrdersHandler } from "./application/queries/list-orders.handler.js";
import { ListProductsHandler } from "./application/queries/list-products.handler.js";
import { ListRatingsHandler } from "./application/queries/list-ratings.handler.js";
import { ListWishlistHandler } from "./application/queries/list-wishlist.handler.js";
import { ListWishlistIdsHandler } from "./application/queries/list-wishlist-ids.handler.js";
import { PriceCartHandler } from "./application/queries/price-cart.handler.js";
import {
  ADDRESS_REPOSITORY,
  CART_REPOSITORY,
  CATEGORY_REPOSITORY,
  ORDER_REPOSITORY,
  PRODUCT_REPOSITORY,
  RATING_REPOSITORY,
  WISHLIST_REPOSITORY,
} from "./domain/shop.repository.js";
import { AddressesResolver } from "./graphql/addresses.resolver.js";
import { CategoriesResolver } from "./graphql/categories.resolver.js";
import { MyCartResolver } from "./graphql/my-cart.resolver.js";
import { MyOrdersResolver } from "./graphql/my-orders.resolver.js";
import { MyWishlistResolver } from "./graphql/my-wishlist.resolver.js";
import { OrdersResolver } from "./graphql/orders.resolver.js";
import { ProductsResolver } from "./graphql/products.resolver.js";
import { RatingsResolver } from "./graphql/ratings.resolver.js";
import { ShopResolver } from "./graphql/shop.resolver.js";
import { AddressesController } from "./http/addresses.controller.js";
import { CategoriesController } from "./http/categories.controller.js";
import { MyCartController } from "./http/my-cart.controller.js";
import { MyOrdersController } from "./http/my-orders.controller.js";
import { MyWishlistController } from "./http/my-wishlist.controller.js";
import { OrdersController } from "./http/orders.controller.js";
import { ProductsController } from "./http/products.controller.js";
import { RatingsController } from "./http/ratings.controller.js";
import { ShopController } from "./http/shop.controller.js";
import { PrismaAddressRepository } from "./infrastructure/prisma-address.repository.js";
import { PrismaCartRepository } from "./infrastructure/prisma-cart.repository.js";
import { PrismaCategoryRepository } from "./infrastructure/prisma-category.repository.js";
import { PrismaOrderRepository } from "./infrastructure/prisma-order.repository.js";
import { PrismaProductRepository } from "./infrastructure/prisma-product.repository.js";
import { PrismaRatingRepository } from "./infrastructure/prisma-rating.repository.js";
import { PrismaWishlistRepository } from "./infrastructure/prisma-wishlist.repository.js";

// Products, categories, addresses, ratings, carts, wishlists and orders
// (ideas/orders)
@Module({
  controllers: [
    ShopController,
    CategoriesController,
    ProductsController,
    RatingsController,
    AddressesController,
    MyCartController,
    MyWishlistController,
    MyOrdersController,
    OrdersController,
  ],
  providers: [
    AddressesResolver,
    MyCartResolver,
    MyWishlistResolver,
    MyOrdersResolver,
    {
      provide: CATEGORY_REPOSITORY,
      useClass: PrismaCategoryRepository,
    },
    {
      provide: PRODUCT_REPOSITORY,
      useClass: PrismaProductRepository,
    },
    {
      provide: ADDRESS_REPOSITORY,
      useClass: PrismaAddressRepository,
    },
    {
      provide: ORDER_REPOSITORY,
      useClass: PrismaOrderRepository,
    },
    {
      provide: RATING_REPOSITORY,
      useClass: PrismaRatingRepository,
    },
    {
      provide: CART_REPOSITORY,
      useClass: PrismaCartRepository,
    },
    {
      provide: WISHLIST_REPOSITORY,
      useClass: PrismaWishlistRepository,
    },
    {
      provide: HTML_SANITIZER,
      useClass: SanitizeHtmlSanitizer,
    },
    CreateCategoryHandler,
    UpdateCategoryHandler,
    DeleteCategoryHandler,
    CreateProductHandler,
    UpdateProductHandler,
    DeleteProductHandler,
    EnsureProductFolderHandler,
    CanAccessProductHandler,
    SetProductImagesHandler,
    SaveAddressHandler,
    DeleteAddressHandler,
    RateProductHandler,
    DeleteRatingHandler,
    AddToCartHandler,
    SetCartQuantityHandler,
    RemoveFromCartHandler,
    MergeCartHandler,
    MergeWishlistHandler,
    AddToWishlistHandler,
    RemoveFromWishlistHandler,
    ClearOrderedFromCart,
    PlaceOrderHandler,
    CancelMyOrderHandler,
    ChangeOrderStatusHandler,
    ChangeOrderPaymentHandler,
    ListCategoriesHandler,
    ListProductsHandler,
    GetProductHandler,
    ListRatingsHandler,
    ListAddressesHandler,
    ListOrdersHandler,
    GetOrderHandler,
    GetCartHandler,
    PriceCartHandler,
    ListGuestWishlistHandler,
    ListWishlistHandler,
    ListWishlistIdsHandler,
    ShopResolver,
    ProductsResolver,
    CategoriesResolver,
    OrdersResolver,
    RatingsResolver,
  ],
})
export class ShopModule {}
