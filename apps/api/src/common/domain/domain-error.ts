// Base for business-rule violations. The http layer maps `kind` to a status.
export type DomainErrorKind =
  | "invalid"
  | "not_found"
  | "conflict"
  | "unauthorized"
  | "forbidden";

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly kind: DomainErrorKind;
}
