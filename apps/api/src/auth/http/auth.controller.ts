import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import {
  type AuthUser,
  CurrentUser,
  Public,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
import {
  ApiFailResponse,
  ApiZodBody,
  ApiZodResponse,
} from "../../common/http/setup/openapi.js";
import { RateLimit } from "../../common/http/guards/rate-limit.js";
import { ZodValidationPipe } from "../../common/http/pipes/zod-validation.pipe.js";
import { LoginCommand } from "../application/commands/login.command.js";
import { RefreshSessionCommand } from "../application/commands/refresh-session.command.js";
import { RegisterCommand } from "../application/commands/register.command.js";
import { RequestPasswordResetCommand } from "../application/commands/request-password-reset.command.js";
import { ResetPasswordWithTokenCommand } from "../application/commands/reset-password-with-token.command.js";
import { RevokeAllSessionsCommand } from "../application/commands/revoke-all-sessions.command.js";
import { RevokeSessionCommand } from "../application/commands/revoke-session.command.js";
import { StartSessionCommand } from "../application/commands/start-session.command.js";
import {
  ListSessionsQuery,
  type SessionView,
} from "../application/queries/list-sessions.query.js";
import { InvalidTokenError } from "../domain/auth.errors.js";
import {
  TOKEN_SERVICE,
  type TokenPair,
  type TokenService,
} from "../domain/tokens.js";
import {
  type ForgotPasswordDto,
  forgotPasswordSchema,
  type LoginDto,
  loginSchema,
  type RefreshDto,
  type RegisterDto,
  type ResetPasswordDto,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  sessionListSchema,
  tokenPairSchema,
  wsTicketSchema,
} from "./auth.dto.js";
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  readCookie,
  setAuthCookies,
} from "./auth-cookies.js";
import { deviceOf } from "./device.js";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  // For the browser's realtime socket: it holds this one-minute ticket, never
  // an access token (those stay in HttpOnly cookies on the web server)
  @Post("ws-ticket")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "One-minute ticket to open the realtime socket",
  })
  @ApiZodResponse(wsTicketSchema)
  async wsTicket(@CurrentUser() user: AuthUser): Promise<{
    ticket: string;
  }> {
    return {
      ticket: await this.tokens.issueWsTicket(user.id, user.sessionId),
    };
  }

  @Post("register")
  @Public()
  @RateLimit({
    limit: 5,
    ttl: 60 * 60_000,
  })
  @ApiOperation({
    summary: "Sign up",
  })
  @ApiZodBody(registerSchema)
  @ApiZodResponse(tokenPairSchema, {
    status: 201,
  })
  @ApiFailResponse(409, "Email already in use")
  @ApiFailResponse(429, "Too many attempts")
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterDto,
    @Req() req: Request,
    @Res({
      passthrough: true,
    })
    res: Response,
  ): Promise<TokenPair> {
    const id = await this.commands.execute(
      new RegisterCommand(body.email, body.password, body.displayName),
    );
    const tokens = await this.commands.execute(
      new StartSessionCommand(id, deviceOf(req)),
    );
    setAuthCookies(res, tokens);
    return tokens;
  }

  @Post("login")
  @Public()
  @RateLimit(
    {
      limit: 10,
      ttl: 60_000,
    },
    {
      limit: 10,
      ttl: 15 * 60_000,
    },
  )
  @ApiOperation({
    summary: "Sign in with email and password",
  })
  @ApiZodBody(loginSchema)
  @ApiZodResponse(tokenPairSchema)
  @ApiFailResponse(401, "Invalid email or password")
  @ApiFailResponse(429, "Too many attempts")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginDto,
    @Req() req: Request,
    @Res({
      passthrough: true,
    })
    res: Response,
  ): Promise<TokenPair> {
    const tokens = await this.commands.execute(
      new LoginCommand(body.email, body.password, deviceOf(req)),
    );
    setAuthCookies(res, tokens);
    return tokens;
  }

  @Post("refresh")
  @Public()
  @RateLimit({
    limit: 30,
    ttl: 60_000,
  })
  @ApiOperation({
    summary: "Exchange a refresh token for new tokens",
  })
  @ApiZodBody(refreshSchema)
  @ApiZodResponse(tokenPairSchema)
  @ApiFailResponse(401, "Invalid or expired token")
  @ApiFailResponse(429, "Too many attempts")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshDto,
    @Req() req: Request,
    @Res({
      passthrough: true,
    })
    res: Response,
  ): Promise<TokenPair> {
    const refreshToken = body.refreshToken ?? readCookie(req, REFRESH_COOKIE);
    if (!refreshToken) {
      throw new InvalidTokenError();
    }
    const tokens = await this.commands.execute(
      new RefreshSessionCommand(refreshToken),
    );
    setAuthCookies(res, tokens);
    return tokens;
  }

  // Always 204, so it never reveals whether an account exists
  // (ideas/users/password-reset.md). Per email: one mail per 5 minutes.
  @Post("password/forgot")
  @Public()
  @RateLimit(
    {
      limit: 5,
      ttl: 15 * 60_000,
    },
    {
      limit: 1,
      ttl: 5 * 60_000,
    },
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Email a password reset link",
  })
  @ApiZodBody(forgotPasswordSchema)
  @ApiNoContentResponse()
  @ApiFailResponse(429, "Too many attempts")
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordDto,
  ): Promise<void> {
    await this.commands.execute(new RequestPasswordResetCommand(body.email));
  }

  // Doesn't sign in: the user logs in with the new password
  @Post("password/reset")
  @Public()
  @RateLimit({
    limit: 10,
    ttl: 15 * 60_000,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Set a new password from a reset link",
  })
  @ApiZodBody(resetPasswordSchema)
  @ApiNoContentResponse()
  @ApiFailResponse(400, "Invalid or expired link, or a weak password")
  @ApiFailResponse(429, "Too many attempts")
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordDto,
  ): Promise<void> {
    await this.commands.execute(
      new ResetPasswordWithTokenCommand(body.token, body.password, body.notify),
    );
  }

  // Signs out this device only. Its access token lasts until it expires (up
  // to 15 minutes); so do access tokens of devices signed out elsewhere.
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Sign out this device (clears the auth cookies)",
  })
  @ApiNoContentResponse()
  @ApiFailResponse(401, "Missing or invalid token")
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({
      passthrough: true,
    })
    res: Response,
  ): Promise<void> {
    await this.commands.execute(
      new RevokeSessionCommand(user.id, user.sessionId),
    );
    clearAuthCookies(res);
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Sign out every device (clears the auth cookies)",
  })
  @ApiNoContentResponse()
  @ApiFailResponse(401, "Missing or invalid token")
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Res({
      passthrough: true,
    })
    res: Response,
  ): Promise<void> {
    await this.commands.execute(new RevokeAllSessionsCommand(user.id));
    clearAuthCookies(res);
  }

  @Get("sessions")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Devices signed in to my account",
  })
  @ApiZodResponse(sessionListSchema)
  sessions(@CurrentUser() user: AuthUser): Promise<SessionView[]> {
    return this.queries.execute(new ListSessionsQuery(user.id, user.sessionId));
  }

  @Delete("sessions/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Sign out one of my devices",
  })
  @ApiNoContentResponse()
  @ApiFailResponse(404, "No such session of mine")
  async revokeSession(
    @CurrentUser() user: AuthUser,
    @Param("id", IdPipe) id: bigint,
  ): Promise<void> {
    await this.commands.execute(new RevokeSessionCommand(user.id, id));
  }
}
