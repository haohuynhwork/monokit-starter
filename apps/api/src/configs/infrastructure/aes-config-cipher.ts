import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import type { ConfigCipher } from "../domain/config-cipher.js";

interface Key {
  // Reveals nothing about the secret, stable across restarts
  kid: string;
  key: Buffer;
}

const derive = (secret: string, info: string, length: number) =>
  Buffer.from(hkdfSync("sha256", secret, "", info, length));

const toKey = (secret: string): Key => ({
  kid: derive(secret, "config-kid", 6).toString("base64url"),
  key: derive(secret, "config-aes-256-gcm", 32),
});

// AES-256-GCM, sealed as 'v1.<kid>.<iv>.<tag>.<ciphertext>' (base64url).
// keys[0] seals; every key opens. Rotate by moving APP_SECRET to
// APP_SECRET_PREVIOUS and setting a new APP_SECRET: on start the api
// seals every stored value again with the new one (ReencryptConfigsCommand),
// after which APP_SECRET_PREVIOUS can go.
export class AesConfigCipher implements ConfigCipher {
  private constructor(private readonly keys: Key[]) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): AesConfigCipher {
    const secrets = [
      env.APP_SECRET,
      env.APP_SECRET_PREVIOUS,
    ];
    if (!secrets[0] && secrets[1]) {
      throw new Error("APP_SECRET_PREVIOUS is set without APP_SECRET");
    }
    const keys = secrets
      .filter((s): s is string => !!s)
      .map((secret, i) => {
        if (secret.length < 32) {
          const name = i === 0 ? "APP_SECRET" : "APP_SECRET_PREVIOUS";
          throw new Error(`${name} must be at least 32 characters`);
        }
        return toKey(secret);
      });
    return new AesConfigCipher(keys);
  }

  get available(): boolean {
    return this.keys.length > 0;
  }

  seal(key: string, value: unknown): string {
    const k = this.keys[0];
    if (!k) {
      throw new Error("APP_SECRET is not set");
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", k.key, iv);
    cipher.setAAD(Buffer.from(key));
    const data = Buffer.concat([
      cipher.update(JSON.stringify(value), "utf8"),
      cipher.final(),
    ]);
    return [
      "v1",
      k.kid,
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      data.toString("base64url"),
    ].join(".");
  }

  open(key: string, sealed: string): unknown {
    const [version, kid, iv, tag, data] = sealed.split(".");
    if (version !== "v1" || !iv || !tag || data === undefined) {
      throw new Error(`Config "${key}" is not a sealed value`);
    }
    const k = this.keys.find((x) => x.kid === kid);
    if (!k) {
      throw new Error(
        `Config "${key}" was sealed with a secret the server doesn't have (APP_SECRET / APP_SECRET_PREVIOUS)`,
      );
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      k.key,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAAD(Buffer.from(key));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const json = Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(json);
  }

  isStale(sealed: string): boolean {
    return sealed.split(".")[1] !== this.keys[0]?.kid;
  }
}
