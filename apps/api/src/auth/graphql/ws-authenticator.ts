import { Inject, Injectable } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import type { AuthUser } from "../../common/http/guards/auth.decorators.js";
import { GetRolePermissionsQuery } from "../../users/application/queries/get-role-permissions.query.js";
import { VerifyWsTicketQuery } from "../application/queries/verify-ws-ticket.query.js";
import { TOKEN_SERVICE, type TokenService } from "../domain/tokens.js";

// Who opens a GraphQL WebSocket, from its connection_init payload:
// { ticket } (browsers: from the wsTicket mutation, valid a minute) or
// { authorization: "Bearer <access token>" } (apps, scripts).
// undefined: no credentials (public operations only); null: bad credentials.
@Injectable()
export class WsAuthenticator {
  constructor(
    private readonly queries: QueryBus,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
  ) {}

  async authenticate(
    params: Record<string, unknown> | undefined,
  ): Promise<AuthUser | null | undefined> {
    const { ticket, authorization } = params ?? {};
    if (typeof ticket === "string") {
      return this.queries.execute(new VerifyWsTicketQuery(ticket));
    }
    if (typeof authorization === "string") {
      const [scheme, token] = authorization.split(" ");
      if (scheme !== "Bearer" || !token) {
        return null;
      }
      try {
        const { userId, role, sessionId } =
          await this.tokens.verifyAccess(token);
        return {
          id: userId,
          role,
          permissions: await this.queries.execute(
            new GetRolePermissionsQuery(role),
          ),
          sessionId,
        };
      } catch {
        return null;
      }
    }
    return undefined;
  }
}
