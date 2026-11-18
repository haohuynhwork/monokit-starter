import type { IncomingMessage } from "node:http";
import type { ApolloDriverConfig } from "@nestjs/apollo";
import type { Request, Response } from "express";
import type { Context } from "graphql-ws";
import { API_PREFIX } from "../http/setup/api-prefix.js";
import type { AuthUser } from "../http/guards/auth.decorators.js";
import { graphqlConfig } from "./graphql.config.js";

// From a connection_init payload: the user, undefined for an anonymous
// socket (public operations only), null to refuse the connection
export type WsAuthenticate = (
  params: Record<string, unknown> | undefined,
) => Promise<AuthUser | null | undefined>;

type Extra = {
  request: IncomingMessage;
  user?: AuthUser;
};

// graphqlConfig plus the graphql-ws protocol (graphql-transport-ws) on the
// same path: queries, mutations and subscriptions over one WebSocket. The
// socket signs in once, in connection_init; the guards, filter and resolvers
// then see a request-like context, as over HTTP.
export function graphqlWsConfig(
  authenticate: WsAuthenticate,
): ApolloDriverConfig {
  return {
    ...graphqlConfig,
    context: (
      ctx:
        | {
            req: Request;
            res: Response;
          }
        | Context,
    ) => ("req" in ctx ? httpContext(ctx) : wsContext(ctx)),
    subscriptions: {
      "graphql-ws": {
        // The driver doesn't add the global prefix to the socket path
        path: `${API_PREFIX}/graphql`,
        onConnect: async (ctx: Context) => {
          const user = await authenticate(ctx.connectionParams);
          if (user === null) {
            // Closes with 4403 Forbidden
            return false;
          }
          (ctx.extra as Extra).user = user;
          return true;
        },
      },
    },
  };
}

const httpContext = ({ req, res }: { req: Request; res: Response }) => ({
  req,
  res,
});

// No response over a socket (no cookies, no rate-limit headers). The
// upgrade request's headers stand in for each operation's; req.ip is the
// socket's peer, so behind a proxy all sockets share its address.
function wsContext(ctx: Context) {
  const { request, user } = ctx.extra as Extra;
  return {
    req: {
      headers: request.headers,
      ip: request.socket.remoteAddress,
      query: {},
      cookies: {},
      user,
    } as unknown as Request,
    res: undefined,
  };
}
