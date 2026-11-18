import type { Readable } from "node:stream";

// One backend (local disk, S3, ...) behind one interface. The database is the
// source of truth for names and visibility; a backend only stores bytes under
// an opaque key. See ideas/storage/index.md.
//
// Methods follow @nestjs/storage's disks (put/get/stat/exists/delete/list/
// copy/move/url/signedUrl/signedUpload), so an S3 backend can wrap its
// S3Disk. Assets the app shows to users still go through the api's per-asset
// links (UrlSigner), which re-check access; signedUrl / signedUpload are for
// handing a client one object directly (downloads, direct uploads).
//
// Keys: relative, '/'-separated, at most 1024 UTF-8 bytes; no empty, '.' or
// '..' segments, backslashes or control characters (InvalidStorageKeyError).

export type StorageBody =
  | Buffer
  | Uint8Array
  | string
  | Readable
  | AsyncIterable<Uint8Array>;

export interface PutOptions {
  // Default: from the key's extension; unknown -> application/octet-stream
  contentType?: string;
  // Sent back as headers when the object is served
  cacheControl?: string;
  contentDisposition?: string;
  // String values, at most 2 KB in total
  metadata?: Record<string, string>;
  // When given, a body of another length is refused (StorageBodyLengthError)
  contentLength?: number;
  signal?: AbortSignal;
}

export interface ObjectInfo {
  key: string;
  size: number;
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  lastModified: Date;
  // Changes whenever the bytes do; quoted, as in HTTP
  etag: string;
}

// Inclusive byte range: { start, end? } or the last `suffix` bytes
export type ByteRange =
  | {
      start: number;
      end?: number;
    }
  | {
      suffix: number;
    };

export interface GetOptions {
  range?: ByteRange;
  signal?: AbortSignal;
}

export interface StoredFile extends ObjectInfo {
  body: Readable;
}

export interface ListOptions {
  prefix?: string;
  // From the previous page
  cursor?: string;
  // 1..1000, default 1000
  limit?: number;
}

export interface ListPage {
  // In UTF-8 byte order of the keys
  items: ObjectInfo[];
  // null on the last page
  cursor: string | null;
}

export interface SignedUrlOptions {
  // Seconds; default 15 minutes, at most 7 days
  expiresIn?: number;
  // Download name (Content-Disposition filename)
  filename?: string;
  // Default 'attachment' when a filename is given, else 'inline'
  disposition?: "inline" | "attachment";
}

export interface SignedUploadOptions {
  // The upload must send exactly this Content-Type
  contentType: string;
  // When given, a body of another length is refused
  contentLength?: number;
  // Seconds; default 15 minutes, at most 7 days
  expiresIn?: number;
}

export interface SignedUpload {
  url: string;
  method: "PUT";
  // Send these with the PUT
  headers: Record<string, string>;
  expiresAt: Date;
}

export interface Storage {
  // Configured name stored on each asset (e.g. 'local')
  readonly name: string;
  // Writes atomically (readers never see half a file); replaces any object
  // under the key
  put(key: string, body: StorageBody, opts?: PutOptions): Promise<ObjectInfo>;
  // Throws StoredObjectNotFoundError when the key does not exist, and
  // StorageRangeError when the range starts past the end
  get(key: string, opts?: GetOptions): Promise<StoredFile>;
  getBuffer(
    key: string,
    opts?: {
      signal?: AbortSignal;
    },
  ): Promise<Buffer>;
  getText(
    key: string,
    opts?: {
      signal?: AbortSignal;
    },
  ): Promise<string>;
  // Metadata only; throws StoredObjectNotFoundError
  stat(key: string): Promise<ObjectInfo>;
  exists(key: string): Promise<boolean>;
  // Missing keys are not an error
  delete(keys: string | string[]): Promise<void>;
  list(opts?: ListOptions): Promise<ListPage>;
  // Every page of list()
  listAll(opts?: Omit<ListOptions, "cursor">): AsyncIterable<ObjectInfo>;
  // Within this backend; throw StoredObjectNotFoundError for a missing source
  copy(from: string, to: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  // Public URL of the object
  url(key: string): Promise<string>;
  // Expiring download link for one object, whatever its visibility
  signedUrl(key: string, opts?: SignedUrlOptions): Promise<string>;
  // Expiring link a client PUTs the bytes to, for exactly that type (and
  // length, when given)
  signedUpload(key: string, opts: SignedUploadOptions): Promise<SignedUpload>;
}

export const SIGNED_URL_DEFAULT_SECONDS = 15 * 60;
export const SIGNED_URL_MAX_SECONDS = 7 * 24 * 60 * 60;

export const STORAGE = Symbol("STORAGE");
