import {
  applyDecorators,
  type ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Throttle, type ThrottlerModuleOptions } from "@nestjs/throttler";
import type { Request } from "express";

// Opt-in per route: the web server renders pages for every visitor, and its
// calls without a forwarded visitor IP all share one address, so a global
// per-IP cap would throttle the whole site. Flood protection for every route
// belongs in the reverse proxy in front.
const RATE_LIMITED = "rateLimited";

type Limit = {
  limit: number;
  ttl: number;
};

// `perIp`: by req.ip (the visitor, see TRUST_PROXY in main.ts).
// `perAccount`: by the normalized `email` in the body, so spreading guesses
// over many addresses doesn't help against one account.
export const RateLimit = (perIp: Limit, perAccount?: Limit) =>
  applyDecorators(
    SetMetadata(
      RATE_LIMITED,
      perAccount
        ? [
            "ip",
            "account",
          ]
        : [
            "ip",
          ],
    ),
    Throttle({
      ip: perIp,
      ...(perAccount && {
        account: perAccount,
      }),
    }),
  );

const optedIn = (context: ExecutionContext, name: string) =>
  (
    Reflect.getMetadata(RATE_LIMITED, context.getHandler()) as
      | string[]
      | undefined
  )?.includes(name) ?? false;

// REST: the body's `email`. GraphQL: an `email` argument, or `input.email`.
const bodyEmail = (context: ExecutionContext) => {
  const email =
    context.getType<"http" | "graphql">() === "graphql"
      ? graphqlEmail(GqlExecutionContext.create(context).getArgs())
      : context.switchToHttp().getRequest<Request>().body?.email;
  return typeof email === "string" ? email.trim().toLowerCase() : undefined;
};

// Counts live in this process; with several api instances, give the module a
// shared store (Valkey) or each instance limits on its own.
export const rateLimitOptions: ThrottlerModuleOptions = {
  errorMessage: "Too many requests; try again later",
  throttlers: [
    // Limits come from @RateLimit; these only fill the required fields
    {
      name: "ip",
      limit: 0,
      ttl: 0,
      skipIf: (context) => !optedIn(context, "ip"),
    },
    {
      name: "account",
      limit: 0,
      ttl: 0,
      skipIf: (context) => !optedIn(context, "account") || !bodyEmail(context),
      getTracker: (_req, context) => `email:${bodyEmail(context)}`,
    },
  ],
};

function graphqlEmail(args: Record<string, unknown>): unknown {
  const input = args.input as Record<string, unknown> | undefined;
  return args.email ?? input?.email;
}
