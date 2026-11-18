import { HmacUrlSigner } from "./hmac-url-signer.js";

function params(url: string) {
  return Object.fromEntries(new URL(url, "http://x").searchParams);
}

describe("HmacUrlSigner", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "n".repeat(40);
    delete process.env.JWT_SECRET_PREVIOUS;
  });

  it("verifies its own links for that asset only", () => {
    const signer = new HmacUrlSigner();
    const url = signer.sign(5n, 9n);
    expect(url).toMatch(/^\/assets\/5\/content\?/);
    expect(signer.verify(5n, params(url))).toBe(9n);
    expect(signer.verify(6n, params(url))).toBeNull();
    expect(
      signer.verify(5n, {
        ...params(url),
        user: "10",
      }),
    ).toBeNull();
  });

  it("rejects expired links", () => {
    const signer = new HmacUrlSigner();
    vi.useFakeTimers();
    const url = signer.sign(5n, 9n);
    vi.advanceTimersByTime(11 * 60 * 1000);
    expect(signer.verify(5n, params(url))).toBeNull();
    vi.useRealTimers();
  });

  it("keeps links of the previous secret valid during rotation", () => {
    const url = new HmacUrlSigner().sign(5n, 9n);
    process.env.JWT_SECRET_PREVIOUS = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "m".repeat(40);
    expect(new HmacUrlSigner().verify(5n, params(url))).toBe(9n);
  });
});
