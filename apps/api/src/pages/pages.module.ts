import { Module } from "@nestjs/common";
import { HTML_SANITIZER } from "../common/domain/html.js";
import { SanitizeHtmlSanitizer } from "../common/infrastructure/sanitize-html.sanitizer.js";
import { CreatePageHandler } from "./application/commands/create-page.handler.js";
import { CreatePageLayoutHandler } from "./application/commands/create-page-layout.handler.js";
import { DeletePageHandler } from "./application/commands/delete-page.handler.js";
import { DeletePageLayoutHandler } from "./application/commands/delete-page-layout.handler.js";
import { MovePageHandler } from "./application/commands/move-page.handler.js";
import { PublishPageHandler } from "./application/commands/publish-page.handler.js";
import { SendContactMessageHandler } from "./application/commands/send-contact-message.handler.js";
import { SetDefaultPageLayoutHandler } from "./application/commands/set-default-page-layout.handler.js";
import { UnpublishPageHandler } from "./application/commands/unpublish-page.handler.js";
import { UpdatePageHandler } from "./application/commands/update-page.handler.js";
import { UpdatePageLayoutHandler } from "./application/commands/update-page-layout.handler.js";
import { GetMenuHandler } from "./application/queries/get-menu.handler.js";
import { GetPageHandler } from "./application/queries/get-page.handler.js";
import { GetPublicPageHandler } from "./application/queries/get-public-page.handler.js";
import { IsPagePathTakenHandler } from "./application/queries/is-page-path-taken.handler.js";
import { ListPageLayoutsHandler } from "./application/queries/list-page-layouts.handler.js";
import { ListPagesHandler } from "./application/queries/list-pages.handler.js";
import { PAGE_REPOSITORY } from "./domain/page.repository.js";
import { PAGE_LAYOUT_REPOSITORY } from "./domain/page-layout.repository.js";
import { PageLayoutsResolver } from "./graphql/page-layouts.resolver.js";
import { PagesResolver } from "./graphql/pages.resolver.js";
import { PublicPagesResolver } from "./graphql/public-pages.resolver.js";
import { PageLayoutsController } from "./http/page-layouts.controller.js";
import { PagesController } from "./http/pages.controller.js";
import { PublicPagesController } from "./http/public-pages.controller.js";
import { PrismaPageRepository } from "./infrastructure/prisma-page.repository.js";
import { PrismaPageLayoutRepository } from "./infrastructure/prisma-page-layout.repository.js";

// Pages built from blocks (ideas/pages). Shares the site's URLs with posts
// through IsPostPathTakenQuery / IsPagePathTakenQuery.
@Module({
  controllers: [
    PagesController,
    PageLayoutsController,
    PublicPagesController,
  ],
  providers: [
    {
      provide: PAGE_REPOSITORY,
      useClass: PrismaPageRepository,
    },
    {
      provide: PAGE_LAYOUT_REPOSITORY,
      useClass: PrismaPageLayoutRepository,
    },
    {
      provide: HTML_SANITIZER,
      useClass: SanitizeHtmlSanitizer,
    },
    CreatePageHandler,
    UpdatePageHandler,
    MovePageHandler,
    PublishPageHandler,
    UnpublishPageHandler,
    DeletePageHandler,
    CreatePageLayoutHandler,
    UpdatePageLayoutHandler,
    SetDefaultPageLayoutHandler,
    DeletePageLayoutHandler,
    SendContactMessageHandler,
    ListPagesHandler,
    GetPageHandler,
    GetPublicPageHandler,
    GetMenuHandler,
    ListPageLayoutsHandler,
    IsPagePathTakenHandler,
    PagesResolver,
    PageLayoutsResolver,
    PublicPagesResolver,
  ],
})
export class PagesModule {}
