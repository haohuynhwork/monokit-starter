import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { webPath } from "../../common/infrastructure/web-path.js";
import type { SignedParams, UrlSigner } from "../domain/url-signer.js";

// Links live a few minutes: long enough to open or download, short enough
// that a shared link stops working soon (ideas/storage "Serving files")
const TTL_SECONDS = 10 * 60;

interface Key {
  kid: string;
  secret: Buffer;
}

// Keys are derived from JWT_SECRET (and JWT_SECRET_PREVIOUS) with their own
// HKDF label, so they rotate with the tokens yet can't sign or verify them
@Injectable()
export class HmacUrlSigner implements UrlSigner {
  private readonly keys: Key[] = [
    process.env.JWT_SECRET,
    process.env.JWT_SECRET_PREVIOUS,
  ]
    .filter((s): s is string => !!s)
    .map((secret) => ({
      kid: derive(secret, "asset-url-kid", 6).toString("base64url"),
      secret: derive(secret, "asset-url", 32),
    }));

  sign(assetId: bigint, userId: bigint): string {
    const key = this.keys[0];
    if (!key) {
      throw new Error("JWT_SECRET must be set to sign file URLs");
    }
    const expires = String(Math.floor(Date.now() / 1000) + TTL_SECONDS);
    const user = String(userId);
    const signature = mac(key.secret, assetId, user, expires, key.kid);
    const query = new URLSearchParams({
      user,
      expires,
      kid: key.kid,
      signature,
    });
    // The signature covers the api path; the link goes through the web app
    return `${webPath(contentPath(assetId))}?${query.toString()}`;
  }

  verify(assetId: bigint, params: Partial<SignedParams>): bigint | null {
    const { user, expires, kid, signature } = params;
    if (!user || !expires || !kid || !signature || !/^\d+$/.test(user)) {
      return null;
    }
    if (!/^\d+$/.test(expires) || Number(expires) < Date.now() / 1000) {
      return null;
    }
    const key = this.keys.find((k) => k.kid === kid);
    if (!key) {
      return null;
    }
    const expected = Buffer.from(mac(key.secret, assetId, user, expires, kid));
    const given = Buffer.from(signature);
    // Constant time, never ===
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return null;
    }
    return BigInt(user);
  }
}

export const contentPath = (assetId: bigint) => `/assets/${assetId}/content`;

// A canonical string with field names and the path, so parameters can't be
// reordered or moved to another asset
function mac(
  secret: Buffer,
  assetId: bigint,
  user: string,
  expires: string,
  kid: string,
): string {
  const canonical = `GET\n${contentPath(assetId)}\nuser=${user}\nexpires=${expires}\nkid=${kid}`;
  return createHmac("sha256", secret).update(canonical).digest("base64url");
}

const derive = (secret: string, info: string, length: number) =>
  Buffer.from(hkdfSync("sha256", secret, "", info, length));
