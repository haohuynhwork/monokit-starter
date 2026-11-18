import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryBus, QueryHandler } from "@nestjs/cqrs";
import type { AuthUser } from "../../../common/http/guards/auth.decorators.js";
import { GetRolePermissionsQuery } from "../../../users/application/queries/get-role-permissions.query.js";
import { GetUserQuery } from "../../../users/application/queries/get-user.query.js";
import { TOKEN_SERVICE, type TokenService } from "../../domain/tokens.js";
import { VerifyWsTicketQuery } from "./verify-ws-ticket.query.js";

@QueryHandler(VerifyWsTicketQuery)
export class VerifyWsTicketHandler
  implements IQueryHandler<VerifyWsTicketQuery>
{
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    private readonly queries: QueryBus,
  ) {}

  async execute({ ticket }: VerifyWsTicketQuery): Promise<AuthUser | null> {
    let claims: {
      userId: bigint;
      sessionId: bigint;
    };
    try {
      claims = await this.tokens.verifyWsTicket(ticket);
    } catch {
      return null;
    }
    // Like refresh: disabling a user takes effect on the next connect
    const user = await this.queries.execute(new GetUserQuery(claims.userId));
    if (user?.status !== "active") {
      return null;
    }
    return {
      id: claims.userId,
      role: user.role,
      permissions: await this.queries.execute(
        new GetRolePermissionsQuery(user.role),
      ),
      sessionId: claims.sessionId,
    };
  }
}
