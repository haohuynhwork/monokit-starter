import { JwtService } from "@nestjs/jwt";
import { InvalidTokenError } from "../domain/auth.errors.js";
import { JwtTokenService } from "./jwt-token.service.js";

const OLD = "o".repeat(40);
const NEW = "n".repeat(40);

function service(current: string, previous?: string): JwtTokenService {
  process.env.JWT_SECRET = current;
  if (previous) {
    process.env.JWT_SECRET_PREVIOUS = previous;
  } else {
    delete process.env.JWT_SECRET_PREVIOUS;
  }
  return new JwtTokenService(new JwtService());
}

const claims = {
  userId: 7n,
  role: "editor" as const,
  sessionId: 12n,
};

describe("JwtTokenService", () => {
  it("issues access tokens that verify", async () => {
    const s = service(NEW);
    const token = await s.issueAccess(claims);
    await expect(s.verifyAccess(token)).resolves.toEqual(claims);
  });

  it("never accepts another token type as an access token", async () => {
    const s = service(NEW);
    const reset = await s.issuePasswordReset(7n, "abc123");
    await expect(s.verifyPasswordReset(reset)).resolves.toEqual({
      userId: 7n,
      fingerprint: "abc123",
    });
    await expect(s.verifyAccess(reset)).rejects.toThrow(InvalidTokenError);
    const access = await s.issueAccess(claims);
    await expect(s.verifyPasswordReset(access)).rejects.toThrow(
      InvalidTokenError,
    );
  });

  it("keeps tokens of the previous secret valid during rotation", async () => {
    const before = await service(OLD).issueAccess(claims);
    await expect(service(NEW, OLD).verifyAccess(before)).resolves.toEqual(
      claims,
    );
  });

  it("rejects tokens of a retired secret", async () => {
    const before = await service(OLD).issueAccess(claims);
    await expect(service(NEW).verifyAccess(before)).rejects.toThrow(
      InvalidTokenError,
    );
  });

  it("makes random refresh tokens and stores only their hash", () => {
    const s = service(NEW);
    const a = s.newRefreshToken();
    expect(a.token).not.toEqual(s.newRefreshToken().token);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).toEqual(s.hashRefreshToken(a.token));
  });

  it("derives the same successor for the same token", () => {
    const s = service(NEW);
    const { token } = s.newRefreshToken();
    const next = s.nextRefreshToken(token);
    expect(next).toEqual(s.nextRefreshToken(token));
    expect(next.token).not.toEqual(token);
    expect(service(OLD).nextRefreshToken(token)).not.toEqual(next);
  });

  it("refuses short secrets", () => {
    expect(() => service("short")).toThrow(/at least 32/);
    expect(() => service(NEW, "short")).toThrow(/JWT_SECRET_PREVIOUS/);
  });
});
