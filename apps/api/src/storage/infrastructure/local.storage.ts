import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Injectable } from "@nestjs/common";
import { webPath } from "../../common/infrastructure/web-path.js";
import {
  InvalidStorageKeyError,
  StorageBodyLengthError,
  StorageRangeError,
  StoredObjectNotFoundError,
} from "../domain/asset.errors.js";
import { FILE_EXTENSIONS } from "../domain/file-policy.js";
import {
  type GetOptions,
  type ListOptions,
  type ListPage,
  type ObjectInfo,
  type PutOptions,
  SIGNED_URL_DEFAULT_SECONDS,
  SIGNED_URL_MAX_SECONDS,
  type SignedUpload,
  type SignedUploadOptions,
  type SignedUrlOptions,
  type Storage,
  type StorageBody,
  type StoredFile,
} from "../domain/storage.js";
import { type LinkFields, LocalLinkSigner } from "./local-link-signer.js";

// Content type by extension: local files keep no metadata of their own
const TYPES = new Map(
  Object.entries(FILE_EXTENSIONS).map(([type, ext]) => [
    `.${ext}`,
    type,
  ]),
);
const contentTypeOf = (key: string) =>
  TYPES.get(extname(key).toLowerCase()) ?? "application/octet-stream";

// Writes in progress and per-object metadata (.meta/<key>.json); never
// valid keys, never listed
const TMP = ".tmp";
const META = ".meta";
const MAX_METADATA_BYTES = 2048;

// What a local file can't hold itself
interface Sidecar {
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
}

// Development backend: files under STORAGE_DIR, public ones served by
// ServeController at /serve/<key>, signed links by StorageLinksController
// at /storage/<key>
@Injectable()
export class LocalStorage implements Storage {
  readonly name = "local";
  private readonly root = resolve(process.env.STORAGE_DIR ?? "storage");
  readonly signer = LocalLinkSigner.fromEnv();

  async put(
    key: string,
    body: StorageBody,
    opts: PutOptions = {},
  ): Promise<ObjectInfo> {
    const path = this.path(key);
    const sidecar = toSidecar(opts);
    const tmp = this.internal(`${TMP}/${randomUUID()}`);
    await mkdir(dirname(path), {
      recursive: true,
    });
    await mkdir(dirname(tmp), {
      recursive: true,
    });
    try {
      await pipeline(toStream(body), createWriteStream(tmp), {
        signal: opts.signal,
      });
      const { size } = await stat(tmp);
      if (opts.contentLength !== undefined && size !== opts.contentLength) {
        throw new StorageBodyLengthError(opts.contentLength, size);
      }
      await this.writeSidecar(key, sidecar);
      // Atomic on one filesystem: readers see the old file or the new one
      await rename(tmp, path);
    } finally {
      await rm(tmp, {
        force: true,
      });
    }
    return this.stat(key);
  }

  async get(key: string, opts: GetOptions = {}): Promise<StoredFile> {
    const info = await this.stat(key);
    let start = 0;
    let end = info.size - 1;
    if (opts.range) {
      if ("suffix" in opts.range) {
        start = Math.max(0, info.size - opts.range.suffix);
      } else {
        start = opts.range.start;
        end = Math.min(opts.range.end ?? end, end);
      }
      if (start >= info.size && info.size > 0) {
        throw new StorageRangeError(info.size);
      }
    }
    const body = createReadStream(this.path(key), {
      start,
      end: Math.max(end, start - 1),
      signal: opts.signal,
    });
    return {
      ...info,
      size: Math.max(0, end - start + 1),
      body,
    };
  }

  async getBuffer(
    key: string,
    opts: {
      signal?: AbortSignal;
    } = {},
  ): Promise<Buffer> {
    try {
      return await readFile(this.path(key), {
        signal: opts.signal,
      });
    } catch (error) {
      throw notFound(error, key);
    }
  }

  async getText(
    key: string,
    opts: {
      signal?: AbortSignal;
    } = {},
  ): Promise<string> {
    return (await this.getBuffer(key, opts)).toString("utf8");
  }

  async stat(key: string): Promise<ObjectInfo> {
    try {
      const info = await stat(this.path(key));
      if (!info.isFile()) {
        throw new StoredObjectNotFoundError(key);
      }
      const sidecar = await this.readSidecar(key);
      return {
        key,
        size: info.size,
        contentType: contentTypeOf(key),
        ...sidecar,
        lastModified: info.mtime,
        etag: `"${info.size.toString(16)}-${Math.trunc(info.mtimeMs).toString(16)}"`,
      };
    } catch (error) {
      throw notFound(error, key);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.stat(key);
      return true;
    } catch (error) {
      if (error instanceof StoredObjectNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  async delete(keys: string | string[]): Promise<void> {
    for (const key of Array.isArray(keys)
      ? keys
      : [
          keys,
        ]) {
      await rm(this.path(key), {
        force: true,
      });
      await rm(this.metaPath(key), {
        force: true,
      });
    }
  }

  // Walks the whole tree and pages in memory: fine for a development disk.
  // The cursor is the last key of the previous page.
  async list(opts: ListOptions = {}): Promise<ListPage> {
    const limit = Math.min(Math.max(opts.limit ?? 1000, 1), 1000);
    const prefix = opts.prefix ?? "";
    const keys = (await this.walk(this.root))
      .filter((k) => k.startsWith(prefix))
      .filter(
        (k) => opts.cursor === undefined || byteCompare(k, opts.cursor) > 0,
      )
      .sort(byteCompare);
    const page = keys.slice(0, limit);
    const items = await Promise.all(page.map((k) => this.stat(k)));
    return {
      items,
      cursor: keys.length > limit ? page[page.length - 1]! : null,
    };
  }

  async *listAll(
    opts: Omit<ListOptions, "cursor"> = {},
  ): AsyncIterable<ObjectInfo> {
    let cursor: string | undefined;
    do {
      const page = await this.list({
        ...opts,
        cursor,
      });
      yield* page.items;
      cursor = page.cursor ?? undefined;
    } while (cursor);
  }

  async copy(from: string, to: string): Promise<void> {
    await this.stat(from);
    await mkdir(dirname(this.path(to)), {
      recursive: true,
    });
    await copyFile(this.path(from), this.path(to));
    await this.writeSidecar(to, await this.readSidecar(from));
  }

  async move(from: string, to: string): Promise<void> {
    await this.stat(from);
    await mkdir(dirname(this.path(to)), {
      recursive: true,
    });
    await this.writeSidecar(to, await this.readSidecar(from));
    await rename(this.path(from), this.path(to));
    await rm(this.metaPath(from), {
      force: true,
    });
  }

  url(key: string): Promise<string> {
    // Relative: the web app (under its base path) forwards /serve/* to the api
    return Promise.resolve(webPath(`/serve/${key}`));
  }

  // Served by StorageLinksController; the signature covers the api path,
  // the link goes through the web app
  signedUrl(key: string, opts: SignedUrlOptions = {}): Promise<string> {
    this.path(key);
    const query = this.signer.sign(
      "GET",
      key,
      expiry(opts.expiresIn),
      downloadFields(opts),
    );
    return Promise.resolve(`${webPath(linkPath(key))}?${query.toString()}`);
  }

  signedUpload(key: string, opts: SignedUploadOptions): Promise<SignedUpload> {
    this.path(key);
    const expiresAt = expiry(opts.expiresIn);
    const query = this.signer.sign("PUT", key, expiresAt, uploadFields(opts));
    return Promise.resolve({
      url: `${webPath(linkPath(key))}?${query.toString()}`,
      method: "PUT",
      headers: {
        "Content-Type": opts.contentType,
        ...(opts.contentLength !== undefined && {
          "Content-Length": String(opts.contentLength),
        }),
      },
      expiresAt,
    });
  }

  // Keys come from the db or signed links, but never let one escape the
  // root or reach the internal folders
  private path(key: string): string {
    checkKey(key);
    if (key.split("/")[0] === TMP || key.split("/")[0] === META) {
      throw new InvalidStorageKeyError(key, "reserved folder");
    }
    return this.internal(key);
  }

  private internal(key: string): string {
    const path = resolve(this.root, key);
    if (!path.startsWith(this.root + sep)) {
      throw new InvalidStorageKeyError(key, "outside the storage root");
    }
    return path;
  }

  private metaPath(key: string): string {
    this.path(key);
    return this.internal(`${META}/${key}.json`);
  }

  private async readSidecar(key: string): Promise<Sidecar> {
    try {
      return JSON.parse(await readFile(this.metaPath(key), "utf8")) as Sidecar;
    } catch {
      return {};
    }
  }

  // None left behind when there is nothing to keep
  private async writeSidecar(key: string, sidecar: Sidecar): Promise<void> {
    const path = this.metaPath(key);
    if (Object.keys(sidecar).length === 0) {
      await rm(path, {
        force: true,
      });
      return;
    }
    await mkdir(dirname(path), {
      recursive: true,
    });
    await writeFile(path, JSON.stringify(sidecar));
  }

  // Every file's key under `dir`, '/'-separated; skips writes in progress
  private async walk(dir: string): Promise<string[]> {
    let entries;
    try {
      entries = await readdir(dir, {
        withFileTypes: true,
      });
    } catch {
      return [];
    }
    const keys: string[] = [];
    for (const e of entries) {
      const full = resolve(dir, e.name);
      if (e.isDirectory()) {
        if (
          full !== resolve(this.root, TMP) &&
          full !== resolve(this.root, META)
        ) {
          keys.push(...(await this.walk(full)));
        }
      } else if (e.isFile()) {
        keys.push(relative(this.root, full).split(sep).join("/"));
      }
    }
    return keys;
  }
}

function toStream(body: StorageBody): Readable {
  if (body instanceof Readable) {
    return body;
  }
  if (typeof body === "string" || body instanceof Uint8Array) {
    return Readable.from([
      typeof body === "string" ? Buffer.from(body) : body,
    ]);
  }
  return Readable.from(body);
}

function notFound(error: unknown, key: string): unknown {
  const code = (
    error as {
      code?: string;
    }
  ).code;
  return code === "ENOENT" || code === "ENOTDIR" || code === "EISDIR"
    ? new StoredObjectNotFoundError(key)
    : error;
}

const byteCompare = (a: string, b: string) =>
  Buffer.compare(Buffer.from(a), Buffer.from(b));

// The rules of @nestjs/storage keys
export function checkKey(key: string): void {
  if (Buffer.byteLength(key) > 1024) {
    throw new InvalidStorageKeyError(key, "longer than 1024 bytes");
  }
  const control = Array.from(
    {
      length: key.length,
    },
    (_, i) => key.charCodeAt(i),
  ).some((c) => c < 0x20 || c === 0x7f);
  if (key.includes("\\") || control) {
    throw new InvalidStorageKeyError(key, "backslash or control character");
  }
  if (key.split("/").some((s) => s === "" || s === "." || s === "..")) {
    throw new InvalidStorageKeyError(key, "empty, '.' or '..' segment");
  }
}

function toSidecar(opts: PutOptions): Sidecar {
  if (opts.metadata) {
    const bytes = Object.entries(opts.metadata).reduce(
      (n, [k, v]) => n + Buffer.byteLength(k) + Buffer.byteLength(v),
      0,
    );
    if (bytes > MAX_METADATA_BYTES) {
      throw new Error(`Metadata is ${bytes} bytes, at most 2048`);
    }
  }
  return {
    ...(opts.contentType && {
      contentType: opts.contentType,
    }),
    ...(opts.cacheControl && {
      cacheControl: opts.cacheControl,
    }),
    ...(opts.contentDisposition && {
      contentDisposition: opts.contentDisposition,
    }),
    ...(opts.metadata && {
      metadata: opts.metadata,
    }),
  };
}

function expiry(seconds = SIGNED_URL_DEFAULT_SECONDS): Date {
  if (!Number.isInteger(seconds) || seconds < 1) {
    throw new Error("expiresIn is a whole number of seconds, 1 or more");
  }
  return new Date(
    Date.now() + Math.min(seconds, SIGNED_URL_MAX_SECONDS) * 1000,
  );
}

// What a signed download link pins; the controller rebuilds it from the query
export function downloadFields(opts: {
  filename?: string;
  disposition?: string;
}): LinkFields {
  const disposition =
    opts.disposition ?? (opts.filename ? "attachment" : "inline");
  return {
    disposition,
    ...(opts.filename !== undefined && {
      filename: opts.filename,
    }),
  };
}

// What a signed upload link pins
export function uploadFields(opts: {
  contentType: string;
  contentLength?: number | string;
}): LinkFields {
  return {
    contentType: opts.contentType,
    ...(opts.contentLength !== undefined && {
      contentLength: String(opts.contentLength),
    }),
  };
}

// Each segment encoded, the slashes kept
export const linkPath = (key: string) =>
  `/storage/${key.split("/").map(encodeURIComponent).join("/")}`;
