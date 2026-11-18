import type { ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { Request } from "express";

// The Express request behind a REST route or a GraphQL resolver (the GraphQL
// context carries it, see common/graphql/graphql.config.ts)
export function requestOf<T extends Request = Request>(
  context: ExecutionContext,
): T {
  return context.getType<"http" | "graphql">() === "graphql"
    ? GqlExecutionContext.create(context).getContext<{
        req: T;
      }>().req
    : context.switchToHttp().getRequest<T>();
}
