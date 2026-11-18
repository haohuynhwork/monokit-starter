// Named ResponseEnvelope, not ApiResponse, to avoid clashing with the
// @nestjs/swagger decorator of that name

// Every api response body is one of three shapes, told apart by `status`
// (the JSend convention):
//   success  the request worked; `data` is the result
//   fail     the client's fault (4xx): invalid input, not found, conflict, ...
//   error    the server's fault (5xx); safe to retry later

export interface ApiSuccess<T = unknown> {
  status: "success";
  // Optional, e.g. "user_created" / "User created" for a toast
  code?: string | null;
  message?: string | null;
  // The result, if any
  data?: T;
}

export interface ApiFail<T = unknown> {
  status: "fail";
  // Stable, machine-readable, e.g. "email_taken", "validation_failed"
  code?: string | null;
  message?: string | null;
  // Extra details about the failure, if any
  data?: T;
}

export interface ApiError<T = unknown> {
  status: "error";
  code?: string | null;
  // Generic; never internals or stack traces
  message?: string | null;
  // Extra details for the client, if any; never internals
  data?: T;
}

export type ResponseEnvelope<T> = ApiSuccess<T> | ApiFail | ApiError;

// Offset pagination, e.g. GET /users?limit=20&offset=40
export interface PaginationMeta {
  // Matching items across all pages
  total: number;
  limit: number;
  offset: number;
}
