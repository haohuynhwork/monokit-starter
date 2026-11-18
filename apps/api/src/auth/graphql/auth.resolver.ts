import { Inject } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Args, Context, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { Request, Response } from "express";
import {
  type AuthUser,
  CurrentUser,
  Public,
} from "../../common/http/guards/auth.decorators.js";
import { IdPipe } from "../../common/http/pipes/id.pipe.js";
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
} from "../http/auth.dto.js";
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  readCookie,
  setAuthCookies,
} from "../http/auth-cookies.js";
import { deviceOf } from "../http/device.js";
import {
  AuthSessionModel,
  ForgotPasswordInput,
  LoginInput,
  RefreshInput,
  RegisterInput,
  ResetPasswordInput,
  TokenPairModel,
  WsTicketModel,
} from "./auth.model.js";

const refreshArgs = new ZodValidationPipe(refreshSchema);

// Same as AuthController: same guards, limits, commands and cookies
@Resolver()
export class AuthResolver {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  @Mutation(() => WsTicketModel, {
    description: "One-minute ticket to open the realtime socket",
  })
  async wsTicket(@CurrentUser() user: AuthUser): Promise<WsTicketModel> {
    return {
      ticket: await this.tokens.issueWsTicket(user.id, user.sessionId),
    };
  }

  @Mutation(() => TokenPairModel, {
    description: "Sign up",
  })
  @Public()
  @RateLimit({
    limit: 5,
    ttl: 60 * 60_000,
  })
  async register(
    @Args(
      "input",
      {
        type: () => RegisterInput,
      },
      new ZodValidationPipe(registerSchema),
    )
    input: RegisterDto,
    @Context("req") req: Request,
    @Context("res") res: Response | undefined,
  ): Promise<TokenPair> {
    const id = await this.commands.execute(
      new RegisterCommand(input.email, input.password, input.displayName),
    );
    const tokens = await this.commands.execute(
      new StartSessionCommand(id, deviceOf(req)),
    );
    // No response to set cookies on over WebSocket; the tokens are returned
    if (res) {
      if (res) {
        setAuthCookies(res, tokens);
      }
    }
    return tokens;
  }

  @Mutation(() => TokenPairModel, {
    description: "Sign in with email and password",
  })
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
  async login(
    @Args(
      "input",
      {
        type: () => LoginInput,
      },
      new ZodValidationPipe(loginSchema),
    )
    input: LoginDto,
    @Context("req") req: Request,
    @Context("res") res: Response | undefined,
  ): Promise<TokenPair> {
    const tokens = await this.commands.execute(
      new LoginCommand(input.email, input.password, deviceOf(req)),
    );
    if (res) {
      setAuthCookies(res, tokens);
    }
    return tokens;
  }

  @Mutation(() => TokenPairModel, {
    description: "Exchange a refresh token (or the cookie) for new tokens",
  })
  @Public()
  @RateLimit({
    limit: 30,
    ttl: 60_000,
  })
  async refresh(
    @Args("input", {
      type: () => RefreshInput,
      nullable: true,
    })
    input: RefreshInput | null | undefined,
    @Context("req") req: Request,
    @Context("res") res: Response | undefined,
  ): Promise<TokenPair> {
    // Optional input: an omitted one reads like an empty REST body
    const body: RefreshDto = refreshArgs.transform({
      refreshToken: input?.refreshToken ?? undefined,
    });
    const refreshToken = body.refreshToken ?? readCookie(req, REFRESH_COOKIE);
    if (!refreshToken) {
      throw new InvalidTokenError();
    }
    const tokens = await this.commands.execute(
      new RefreshSessionCommand(refreshToken),
    );
    if (res) {
      setAuthCookies(res, tokens);
    }
    return tokens;
  }

  // Always true, so it never reveals whether an account exists
  @Mutation(() => Boolean, {
    description: "Email a password reset link",
  })
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
  async forgotPassword(
    @Args(
      "input",
      {
        type: () => ForgotPasswordInput,
      },
      new ZodValidationPipe(forgotPasswordSchema),
    )
    input: ForgotPasswordDto,
  ): Promise<boolean> {
    await this.commands.execute(new RequestPasswordResetCommand(input.email));
    return true;
  }

  @Mutation(() => Boolean, {
    description: "Set a new password from a reset link (doesn't sign in)",
  })
  @Public()
  @RateLimit({
    limit: 10,
    ttl: 15 * 60_000,
  })
  async resetPassword(
    @Args(
      "input",
      {
        type: () => ResetPasswordInput,
      },
      new ZodValidationPipe(resetPasswordSchema),
    )
    input: ResetPasswordDto,
  ): Promise<boolean> {
    await this.commands.execute(
      new ResetPasswordWithTokenCommand(
        input.token,
        input.password,
        input.notify,
      ),
    );
    return true;
  }

  @Mutation(() => Boolean, {
    description: "Sign out this device (clears the auth cookies)",
  })
  async logout(
    @CurrentUser() user: AuthUser,
    @Context("res") res: Response | undefined,
  ): Promise<boolean> {
    await this.commands.execute(
      new RevokeSessionCommand(user.id, user.sessionId),
    );
    if (res) {
      clearAuthCookies(res);
    }
    return true;
  }

  @Mutation(() => Boolean, {
    description: "Sign out every device (clears the auth cookies)",
  })
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Context("res") res: Response | undefined,
  ): Promise<boolean> {
    await this.commands.execute(new RevokeAllSessionsCommand(user.id));
    if (res) {
      clearAuthCookies(res);
    }
    return true;
  }

  @Query(
    () => [
      AuthSessionModel,
    ],
    {
      description: "Devices signed in to my account",
    },
  )
  sessions(@CurrentUser() user: AuthUser): Promise<SessionView[]> {
    return this.queries.execute(new ListSessionsQuery(user.id, user.sessionId));
  }

  @Mutation(() => Boolean, {
    description: "Sign out one of my devices",
  })
  async revokeSession(
    @CurrentUser() user: AuthUser,
    @Args(
      "id",
      {
        type: () => ID,
      },
      IdPipe,
    )
    id: bigint,
  ): Promise<boolean> {
    await this.commands.execute(new RevokeSessionCommand(user.id, id));
    return true;
  }
}
