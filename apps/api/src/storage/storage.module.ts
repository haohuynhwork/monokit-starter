import { Module } from "@nestjs/common";
import { AttachAssetHandler } from "./application/commands/attach-asset.handler.js";
import { CreateFolderHandler } from "./application/commands/create-folder.handler.js";
import { CreateLinkHandler } from "./application/commands/create-link.handler.js";
import { DeleteAssetHandler } from "./application/commands/delete-asset.handler.js";
import { DetachAssetsHandler } from "./application/commands/detach-assets.handler.js";
import { EnsureEntityFolderHandler } from "./application/commands/ensure-entity-folder.handler.js";
import { EnsureFolderHandler } from "./application/commands/ensure-folder.handler.js";
import { MoveAssetHandler } from "./application/commands/move-asset.handler.js";
import { RenameAssetHandler } from "./application/commands/rename-asset.handler.js";
import { SetAssetUsagesHandler } from "./application/commands/set-asset-usages.handler.js";
import { SetAssetVisibilityHandler } from "./application/commands/set-asset-visibility.handler.js";
import { SetLinkUrlHandler } from "./application/commands/set-link-url.handler.js";
import { UploadAssetHandler } from "./application/commands/upload-asset.handler.js";
import { CheckFolderAccessHandler } from "./application/queries/check-folder-access.handler.js";
import { FindPublicFilesByKeysHandler } from "./application/queries/find-public-files.handler.js";
import { GetAssetHandler } from "./application/queries/get-asset.handler.js";
import { GetAssetUrlHandler } from "./application/queries/get-asset-url.handler.js";
import { GetAssetUsagesHandler } from "./application/queries/get-asset-usages.handler.js";
import { GetPublicFileHandler } from "./application/queries/get-public-file.handler.js";
import { GetPublicLinkUrlHandler } from "./application/queries/get-public-link-url.handler.js";
import { GetSignedFileHandler } from "./application/queries/get-signed-file.handler.js";
import { HasPrivateAssetUsagesHandler } from "./application/queries/has-private-asset-usages.handler.js";
import { ListAssetsHandler } from "./application/queries/list-assets.handler.js";
import { ListFoldersHandler } from "./application/queries/list-folders.handler.js";
import { ResolveContentUrlsHandler } from "./application/queries/resolve-content-urls.handler.js";
import { ASSET_REPOSITORY } from "./domain/asset.repository.js";
import { ASSET_USAGE_REPOSITORY } from "./domain/asset-usage.repository.js";
import { STORAGE } from "./domain/storage.js";
import { URL_SIGNER } from "./domain/url-signer.js";
import { AssetsResolver } from "./graphql/assets.resolver.js";
import { AssetsController } from "./http/assets.controller.js";
import { ServeController } from "./http/serve.controller.js";
import { StorageLinksController } from "./http/storage-links.controller.js";
import { HmacUrlSigner } from "./infrastructure/hmac-url-signer.js";
import { LocalStorage } from "./infrastructure/local.storage.js";
import { PrismaAssetRepository } from "./infrastructure/prisma-asset.repository.js";
import { PrismaAssetUsageRepository } from "./infrastructure/prisma-asset-usage.repository.js";

@Module({
  controllers: [
    AssetsController,
    ServeController,
    StorageLinksController,
  ],
  providers: [
    {
      provide: STORAGE,
      useClass: LocalStorage,
    },
    {
      provide: ASSET_REPOSITORY,
      useClass: PrismaAssetRepository,
    },
    {
      provide: URL_SIGNER,
      useClass: HmacUrlSigner,
    },
    {
      provide: ASSET_USAGE_REPOSITORY,
      useClass: PrismaAssetUsageRepository,
    },
    AttachAssetHandler,
    DetachAssetsHandler,
    GetAssetUsagesHandler,
    SetAssetUsagesHandler,
    FindPublicFilesByKeysHandler,
    HasPrivateAssetUsagesHandler,
    UploadAssetHandler,
    DeleteAssetHandler,
    CreateFolderHandler,
    CreateLinkHandler,
    EnsureFolderHandler,
    EnsureEntityFolderHandler,
    RenameAssetHandler,
    SetLinkUrlHandler,
    MoveAssetHandler,
    SetAssetVisibilityHandler,
    CheckFolderAccessHandler,
    ListAssetsHandler,
    ListFoldersHandler,
    GetAssetHandler,
    GetAssetUrlHandler,
    GetPublicFileHandler,
    GetSignedFileHandler,
    ResolveContentUrlsHandler,
    GetPublicLinkUrlHandler,
    AssetsResolver,
  ],
})
export class StorageModule {}
