import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { LoginHandler } from "./application/commands/login.handler.js";
import { RefreshSessionHandler } from "./application/commands/refresh-session.handler.js";
import { RegisterHandler } from "./application/commands/register.handler.js";
import { RequestPasswordResetHandler } from "./application/commands/request-password-reset.handler.js";
import { ResetPasswordWithTokenHandler } from "./application/commands/reset-password-with-token.handler.js";
import { RevokeAllSessionsHandler } from "./application/commands/revoke-all-sessions.handler.js";
import { RevokeSessionHandler } from "./application/commands/revoke-session.handler.js";
import { StartSessionHandler } from "./application/commands/start-session.handler.js";
import { ListSessionsHandler } from "./application/queries/list-sessions.handler.js";
import { VerifyWsTicketHandler } from "./application/queries/verify-ws-ticket.handler.js";
import { SESSION_REPOSITORY } from "./domain/session.repository.js";
import { TOKEN_SERVICE } from "./domain/tokens.js";
import { AuthResolver } from "./graphql/auth.resolver.js";
import { WsAuthenticator } from "./graphql/ws-authenticator.js";
import { AuthController } from "./http/auth.controller.js";
import { AuthGuard } from "./http/auth.guard.js";
import { PermissionResolver } from "./http/permission-resolver.js";
import { JwtTokenService } from "./infrastructure/jwt-token.service.js";
import { PrismaSessionRepository } from "./infrastructure/prisma-session.repository.js";

@Module({
  imports: [
    // Keys come from JwtKeyring per call; validated when JwtTokenService starts
    JwtModule.register({}),
  ],
  controllers: [
    AuthController,
  ],
  providers: [
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenService,
    },
    {
      provide: SESSION_REPOSITORY,
      useClass: PrismaSessionRepository,
    },
    PermissionResolver,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    RegisterHandler,
    RequestPasswordResetHandler,
    ResetPasswordWithTokenHandler,
    StartSessionHandler,
    LoginHandler,
    RefreshSessionHandler,
    RevokeSessionHandler,
    RevokeAllSessionsHandler,
    ListSessionsHandler,
    VerifyWsTicketHandler,
    AuthResolver,
    WsAuthenticator,
  ],
  exports: [
    WsAuthenticator,
  ],
})
export class AuthModule {}
