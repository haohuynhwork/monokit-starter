import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CqrsModule } from "@nestjs/cqrs";
import { GraphQLModule } from "@nestjs/graphql";
import { ThrottlerModule } from "@nestjs/throttler";
import { DatabaseModule } from "@packages/nest";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { AuditModule } from "./audit/audit.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { WsAuthenticator } from "./auth/graphql/ws-authenticator.js";
import { graphqlWsConfig } from "./common/graphql/graphql-ws.js";
import { ApiExceptionFilter } from "./common/http/responses/api-exception.filter.js";
import { rateLimitOptions } from "./common/http/guards/rate-limit.js";
import { ResponseInterceptor } from "./common/http/responses/response.interceptor.js";
import { ApiThrottlerGuard } from "./common/http/guards/throttler.guard.js";
import { ConfigsModule } from "./configs/configs.module.js";
import { ContactModule } from "./contact/contact.module.js";
import { ContentModule } from "./content/content.module.js";
import { GeoModule } from "./geo/geo.module.js";
import { HealthModule } from "./health/health.module.js";
import { MailModule } from "./mail/mail.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { PagesModule } from "./pages/pages.module.js";
import { PostsModule } from "./posts/posts.module.js";
import { ShopModule } from "./shop/shop.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { UsersModule } from "./users/users.module.js";

@Module({
  imports: [
    DatabaseModule,
    CqrsModule.forRoot(),
    ThrottlerModule.forRoot(rateLimitOptions),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [
        AuthModule,
      ],
      inject: [
        WsAuthenticator,
      ],
      useFactory: (ws: WsAuthenticator) =>
        graphqlWsConfig((params) => ws.authenticate(params)),
    }),
    AuditModule,
    UsersModule,
    AuthModule,
    StorageModule,
    PostsModule,
    PagesModule,
    ContactModule,
    ContentModule,
    NotificationsModule,
    HealthModule,
    ConfigsModule,
    MailModule,
    GeoModule,
    ShopModule,
  ],
  controllers: [
    AppController,
  ],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ApiThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
