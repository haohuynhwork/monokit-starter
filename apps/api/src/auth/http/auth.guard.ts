import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  type AuthenticatedRequest,
  type AuthUser,
  IS_PUBLIC,
  PERMISSIONS_REQUIRED,
} from "../../common/http/guards/auth.decorators.js";
import { requestOf } from "../../common/http/request/request.js";
import { InvalidTokenError } from "../domain/auth.errors.js";
import { TOKEN_SERVICE, type TokenService } from "../domain/tokens.js";
import { ACCESS_COOKIE, readCookie } from "./auth-cookies.js";
import { PermissionResolver } from "./permission-resolver.js";

// Global: every route needs a valid access token unless marked @Public().
// The token comes from `Authorization: Bearer ...` or the access_token cookie.
// The role comes from the token; its permissions from a cached lookup, so
// most checks need no query.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    private readonly permissions: PermissionResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [
      context.getHandler(),
      context.getClass(),
    ];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) {
      return true;
    }

    const request = requestOf<AuthenticatedRequest>(context);
    // A GraphQL WebSocket signs in once, when it connects
    // (common/graphql/graphql-ws.ts); HTTP requests carry a token each time
    const user = request.user ?? (await this.userOf(request));

    const needed = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_REQUIRED,
      targets,
    );
    if (needed && !needed.some((p) => user.permissions.has(p))) {
      throw new ForbiddenException();
    }
    return true;
  }

  private async userOf(request: AuthenticatedRequest): Promise<AuthUser> {
    const token = bearerToken(request) ?? readCookie(request, ACCESS_COOKIE);
    if (!token) {
      throw new InvalidTokenError();
    }
    const { userId, role, sessionId } = await this.tokens.verifyAccess(token);
    request.user = {
      id: userId,
      role,
      permissions: await this.permissions.permissionsOf(role),
      sessionId,
    };
    return request.user;
  }
}

function bearerToken(request: AuthenticatedRequest): string | undefined {
  const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
  return scheme === "Bearer" && token ? token : undefined;
}
