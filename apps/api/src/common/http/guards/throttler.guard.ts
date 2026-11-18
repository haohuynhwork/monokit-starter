import { type ExecutionContext, Injectable } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { ThrottlerGuard } from "@nestjs/throttler";

// ThrottlerGuard that also limits GraphQL resolvers marked @RateLimit
@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  protected override getRequestResponse(context: ExecutionContext) {
    if (context.getType<"http" | "graphql">() === "graphql") {
      const { req, res } = GqlExecutionContext.create(context).getContext();
      return {
        req,
        // None over a GraphQL WebSocket: the limit applies, headers are skipped
        res: res ?? noHeaders,
      };
    }
    return super.getRequestResponse(context);
  }
}

const noHeaders = {
  header: () => undefined,
};
