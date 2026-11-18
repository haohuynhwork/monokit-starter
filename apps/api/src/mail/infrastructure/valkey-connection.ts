// valkey:// and valkeys:// (TLS) are Valkey's own schemes; redis:// and
// rediss:// are accepted too, for hosted services that hand those out
const PLAIN = new Set([
  "valkey:",
  "redis:",
]);
const TLS = new Set([
  "valkeys:",
  "rediss:",
]);

// VALKEY_URL ('valkey://user:pass@host:6379/0') -> connection options for
// BullMQ, which hands them to iovalkey (valkey-client.ts)
export function valkeyConnection(url: string) {
  const u = new URL(url);
  if (!PLAIN.has(u.protocol) && !TLS.has(u.protocol)) {
    throw new Error(
      `VALKEY_URL must start with valkey://, valkeys://, redis:// or rediss:// (got ${u.protocol}//)`,
    );
  }
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    db: u.pathname.length > 1 ? Number(u.pathname.slice(1)) : 0,
    ...(TLS.has(u.protocol) && {
      tls: {},
    }),
  };
}
