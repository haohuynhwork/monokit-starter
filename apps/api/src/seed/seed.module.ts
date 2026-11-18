import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { DatabaseModule } from "@packages/nest";
import { AuditModule } from "../audit/audit.module.js";
import { ConfigsModule } from "../configs/configs.module.js";
import { GeoModule } from "../geo/geo.module.js";
import { PagesModule } from "../pages/pages.module.js";
import { PostsModule } from "../posts/posts.module.js";
import { ShopModule } from "../shop/shop.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { UsersModule } from "../users/users.module.js";

// Just what seeding needs: no http, no auth (so no JWT_SECRET)
@Module({
  imports: [
    DatabaseModule,
    CqrsModule.forRoot(),
    AuditModule,
    UsersModule,
    StorageModule,
    ConfigsModule,
    GeoModule,
    ShopModule,
    PostsModule,
    PagesModule,
  ],
})
export class SeedModule {}
