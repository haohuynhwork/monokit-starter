import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { GqlContextType } from "@nestjs/graphql";
import type { ApiError, ApiFail } from "@packages/contracts";
import type { Response } from "express";
import { GraphQLError } from "graphql";
import { DomainError, type DomainErrorKind } from "../../domain/domain-error.js";

const STATUS: Record<DomainErrorKind, HttpStatus> = {
  invalid: HttpStatus.BAD_REQUEST,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
  unauthorized: HttpStatus.UNAUTHORIZED,
  forbidden: HttpStatus.FORBIDDEN,
};

// Turns every exception into a `fail` (4xx) or `error` (5xx) body. For
// GraphQL, into an entry of `errors` with the same code in `extensions`.
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): GraphQLError | undefined {
    const [status, body] = this.toBody(exception);
    if (host.getType<GqlContextType>() === "graphql") {
      return new GraphQLError(body.message ?? "Request failed", {
        extensions: {
          code: body.code,
          status,
          // Validation issues, as in the REST body's `data`
          ...(body.status === "fail" &&
            (body.data as Record<string, unknown> | undefined)),
        },
      });
    }
    host.switchToHttp().getResponse<Response>().status(status).json(body);
    return undefined;
  }

  private toBody(exception: unknown): [
    number,
    ApiFail | ApiError,
  ] {
    if (exception instanceof DomainError) {
      return [
        STATUS[exception.kind],
        {
          status: "fail",
          code: exception.code,
          message: exception.message,
        },
      ];
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status < 500) {
        const res = exception.getResponse();
        const { message, issues } = (
          typeof res === "object"
            ? res
            : {
                message: res,
              }
        ) as {
          message?: unknown;
          issues?: {
            path: string;
            message: string;
          }[];
        };
        return [
          status,
          {
            status: "fail",
            code: issues ? "validation_failed" : codeFor(status),
            message: typeof message === "string" ? message : exception.message,
            // Per-field validation issues from ZodValidationPipe
            ...(issues && {
              data: {
                issues,
              },
            }),
          },
        ];
      }
    }

    // Unknown or 5xx: log it, tell the client nothing about internals
    this.logger.error(exception);
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    return [
      status,
      {
        status: "error",
        code: "internal_error",
        message: "Internal server error",
      },
    ];
  }
}

// 404 -> 'not_found', 429 -> 'too_many_requests'
function codeFor(status: number): string {
  return (HttpStatus[status] ?? "bad_request").toLowerCase();
}
