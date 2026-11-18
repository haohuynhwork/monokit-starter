import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { ApiSuccess, PaginationMeta } from "@packages/contracts";
import { map, type Observable } from "rxjs";
import { Paginated } from "./paginated.js";

// Wraps what a controller returns in { status: 'success', data }, adding
// `meta` for a Paginated. Handlers that return nothing (204) stay without a
// body. GraphQL results go out as they are (GraphQL has its own shape).
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Body<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Body<T>> {
    if (context.getType() !== "http") {
      return next.handle() as Observable<Body<T>>;
    }
    return next.handle().pipe(map((data) => wrap(data)));
  }
}

type Body<T> =
  | ApiSuccess<T>
  | (ApiSuccess<unknown[]> & {
      meta: PaginationMeta;
    })
  | undefined;

function wrap<T>(data: T): Body<T> {
  if (data === undefined) {
    return undefined;
  }
  if (data instanceof Paginated) {
    return {
      status: "success",
      data: data.items,
      meta: data.meta,
    };
  }
  return {
    status: "success",
    data,
  };
}
