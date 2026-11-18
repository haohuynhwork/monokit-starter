import { InvalidTokenError } from "./auth.errors.js";
import { REFRESH_GRACE_MS, SESSION_TTL_MS, Session } from "./session.js";

const T0 = new Date("2026-11-03T10:00:00Z");
const at = (ms: number) => new Date(T0.getTime() + ms);
const device = {
  userAgent: "Firefox",
  ip: "10.0.0.1",
};

// h1 -> h2 -> h3: hashes of a token and its successors
const started = () => Session.start(7n, "h1", device, T0);

describe("Session", () => {
  it("rotates on the current token and slides expiry", () => {
    const s = started();
    expect(s.refresh("h1", "h2", at(1000))).toBe("rotated");
    const snap = s.snapshot();
    expect(snap.tokenHash).toBe("h2");
    expect(snap.previousTokenHash).toBe("h1");
    expect(snap.expiresAt).toBe(at(1000 + SESSION_TTL_MS).toISOString());
  });

  it("gives a racing tab the same successor within the grace window", () => {
    const s = started();
    s.refresh("h1", "h2", at(0));
    expect(s.refresh("h1", "h2", at(REFRESH_GRACE_MS))).toBe("grace");
    expect(s.snapshot().tokenHash).toBe("h2");
    expect(s.isRevoked).toBe(false);
  });

  it("revokes on reuse of the previous token after the grace window", () => {
    const s = started();
    s.refresh("h1", "h2", at(0));
    expect(s.refresh("h1", "h2", at(REFRESH_GRACE_MS + 1))).toBe("reuse");
    expect(s.isRevoked).toBe(true);
    expect(() => s.refresh("h2", "h3", at(REFRESH_GRACE_MS + 2))).toThrow(
      InvalidTokenError,
    );
  });

  it("revokes when the previous token does not lead to the current one", () => {
    const s = started();
    s.refresh("h1", "h2", at(0));
    expect(s.refresh("h1", "other", at(1))).toBe("reuse");
    expect(s.isRevoked).toBe(true);
  });

  it("refuses expired sessions and unknown tokens", () => {
    expect(() => started().refresh("h1", "h2", at(SESSION_TTL_MS))).toThrow(
      InvalidTokenError,
    );
    expect(() => started().refresh("x", "y", at(1))).toThrow(InvalidTokenError);
  });

  it("belongs to its user only", () => {
    expect(started().isOwnedBy(7n)).toBe(true);
    expect(started().isOwnedBy(8n)).toBe(false);
  });
});
