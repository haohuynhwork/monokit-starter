import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  InvalidStorageKeyError,
  StorageSignedUrlError,
} from "../domain/asset.errors.js";
import { downloadFields, LocalStorage, uploadFields } from "./local.storage.js";

const SECRET = "a".repeat(32);

describe("LocalStorage", () => {
  let dir: string;
  let storage: LocalStorage;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "storage-"));
    process.env.STORAGE_DIR = dir;
    process.env.APP_SECRET = SECRET;
    storage = new LocalStorage();
  });
  afterEach(async () => {
    await rm(dir, {
      recursive: true,
      force: true,
    });
  });

  it("keeps put options and carries them through copy and move", async () => {
    await storage.put("a/b.png", "x", {
      contentType: "image/png",
      cacheControl: "no-cache",
      metadata: {
        owner: "7",
      },
    });
    await storage.copy("a/b.png", "c.png");
    await storage.move("c.png", "d.png");
    const info = await storage.stat("d.png");
    expect(info).toMatchObject({
      contentType: "image/png",
      cacheControl: "no-cache",
      metadata: {
        owner: "7",
      },
    });
    expect(await storage.exists("c.png")).toBe(false);
    // Metadata is internal, never listed
    const keys = [];
    for await (const o of storage.listAll()) {
      keys.push(o.key);
    }
    expect(keys.sort()).toEqual([
      "a/b.png",
      "d.png",
    ]);
  });

  it("drops old metadata when an object is replaced", async () => {
    await storage.put("x.txt", "1", {
      metadata: {
        v: "1",
      },
    });
    await storage.put("x.txt", "2");
    expect((await storage.stat("x.txt")).metadata).toBeUndefined();
  });

  it("refuses keys outside the rules", async () => {
    for (const key of [
      "",
      "a//b",
      "./a",
      "a/../b",
      "a\\b",
      "a\nb",
      ".meta/x",
    ]) {
      await expect(storage.put(key, "x")).rejects.toThrow(
        InvalidStorageKeyError,
      );
    }
  });

  it("signs download links for one key and its options", async () => {
    const url = await storage.signedUrl("a.pdf", {
      filename: "Report.pdf",
    });
    const query = Object.fromEntries(new URL(url, "http://x").searchParams);
    const fields = downloadFields(query);
    expect(fields).toEqual({
      disposition: "attachment",
      filename: "Report.pdf",
    });
    expect(() =>
      storage.signer.verify("GET", "a.pdf", query, fields),
    ).not.toThrow();
    expect(() => storage.signer.verify("GET", "b.pdf", query, fields)).toThrow(
      StorageSignedUrlError,
    );
    expect(() =>
      storage.signer.verify("GET", "a.pdf", query, {
        ...fields,
        filename: "Other.pdf",
      }),
    ).toThrow(StorageSignedUrlError);
  });

  it("signs uploads for one method, type and length", async () => {
    const upload = await storage.signedUpload("u.png", {
      contentType: "image/png",
      contentLength: 3,
      expiresIn: 60,
    });
    expect(upload.headers).toEqual({
      "Content-Type": "image/png",
      "Content-Length": "3",
    });
    const query = Object.fromEntries(
      new URL(upload.url, "http://x").searchParams,
    );
    const fields = uploadFields(
      query as {
        contentType: string;
      },
    );
    expect(() =>
      storage.signer.verify("PUT", "u.png", query, fields),
    ).not.toThrow();
    const wrongMethod = () =>
      storage.signer.verify("GET", "u.png", query, fields);
    expect(wrongMethod).toThrow(
      expect.objectContaining({
        reason: "method",
      }),
    );
    expect(() =>
      storage.signer.verify("PUT", "u.png", query, {
        ...fields,
        contentType: "image/gif",
      }),
    ).toThrow(StorageSignedUrlError);
  });

  it("refuses expired links", async () => {
    const url = await storage.signedUrl("a.png", {
      expiresIn: 1,
    });
    const query = Object.fromEntries(new URL(url, "http://x").searchParams);
    vi.useFakeTimers({
      now: Date.now() + 5000,
    });
    try {
      expect(() =>
        storage.signer.verify("GET", "a.png", query, downloadFields(query)),
      ).toThrow(
        expect.objectContaining({
          reason: "expired",
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
