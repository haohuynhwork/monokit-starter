// Postgres errors arrive wrapped; walk the cause chain for the driver error
export function sqlError(error: unknown):
  | {
      sqlState?: string;
      constraint?: string;
    }
  | undefined {
  type E = {
    sqlState?: string;
    constraint?: string;
    cause?: unknown;
  };
  for (let e = error as E | undefined; e; e = e.cause as E) {
    if (e.sqlState) {
      return e;
    }
  }
  return undefined;
}
