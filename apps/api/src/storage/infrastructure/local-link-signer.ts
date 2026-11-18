import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";
import { StorageSignedUrlError } from "../domain/asset.errors.js";

// Signs the local backend's signedUrl / signedUpload links. Keys are derived
// from APP_SECRET (and APP_SECRET_PREVIOUS while rotating) with their own
// HKDF label: keys[0] signs, every key verifies.

export interface LinkParams {
  expires: string;
  kid: string;
  signature: string;
}

export type LinkFields = Record<string, string>;

interface Key {
  kid: string;
  secret: Buffer;
}

export class LocalLinkSigner {
  private constructor(private readonly keys: Key[]) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): LocalLinkSigner {
    const keys = [
      env.APP_SECRET,
      env.APP_SECRET_PREVIOUS,
    ]
      .filter((s): s is string => !!s)
      .map((secret) => ({
        kid: derive(secret, "storage-link-kid", 6).toString("base64url"),
        secret: derive(secret, "storage-link-hmac", 32),
      }));
    return new LocalLinkSigner(keys);
  }

  // Query string covering the method, the key, the expiry and `fields`
  sign(
    method: "GET" | "PUT",
    key: string,
    expiresAt: Date,
    fields: LinkFields,
  ): URLSearchParams {
    const k = this.keys[0];
    if (!k) {
      throw new Error("APP_SECRET must be set to sign storage links");
    }
    const expires = String(Math.floor(expiresAt.getTime() / 1000));
    return new URLSearchParams({
      ...fields,
      expires,
      kid: k.kid,
      signature: mac(k.secret, method, key, expires, k.kid, fields),
    });
  }

  // Throws StorageSignedUrlError unless the link was signed for exactly this
  // method, key and fields and hasn't expired
  verify(
    method: "GET" | "PUT",
    key: string,
    params: Partial<LinkParams>,
    fields: LinkFields,
  ): void {
    const { expires, kid, signature } = params;
    if (!expires || !kid || !signature) {
      throw new StorageSignedUrlError("missing");
    }
    const k = this.keys.find((x) => x.kid === kid);
    if (!k || !/^\d+$/.test(expires)) {
      throw new StorageSignedUrlError("invalid");
    }
    const given = Buffer.from(signature);
    const matches = (m: string) => {
      const expected = Buffer.from(mac(k.secret, m, key, expires, kid, fields));
      return (
        expected.length === given.length && timingSafeEqual(expected, given)
      );
    };
    if (!matches(method)) {
      // Signed, but for the other method
      const other = method === "GET" ? "PUT" : "GET";
      throw new StorageSignedUrlError(matches(other) ? "method" : "invalid");
    }
    if (Number(expires) < Date.now() / 1000) {
      throw new StorageSignedUrlError("expired");
    }
  }
}

// Canonical string with field names, so values can't be shifted between
// fields or the link moved to another key
function mac(
  secret: Buffer,
  method: string,
  key: string,
  expires: string,
  kid: string,
  fields: LinkFields,
): string {
  const extra = Object.keys(fields)
    .sort()
    .map((name) => `${name}=${fields[name]}`);
  const canonical = [
    method,
    `key=${key}`,
    ...extra,
    `expires=${expires}`,
    `kid=${kid}`,
  ].join("\n");
  return createHmac("sha256", secret).update(canonical).digest("base64url");
}

const derive = (secret: string, info: string, length: number) =>
  Buffer.from(hkdfSync("sha256", secret, "", info, length));
