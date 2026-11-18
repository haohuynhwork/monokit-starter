import {
  EmptyFileError,
  FileTooLargeError,
  UnsupportedFileTypeError,
} from "./asset.errors.js";

// What an upload slot accepts, e.g. avatars: small web images
export interface FilePolicy {
  mimeTypes: readonly FileMimeType[];
  maxBytes: number;
}

// Types recognised from their bytes; anything else is rejected
export type FileMimeType =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/gif"
  | "application/pdf";

export const FILE_EXTENSIONS: Record<FileMimeType, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

export const AVATAR_POLICY: FilePolicy = {
  mimeTypes: [
    "image/png",
    "image/jpeg",
    "image/webp",
  ],
  maxBytes: 2 * 1024 * 1024,
};

// The media library
export const LIBRARY_POLICY: FilePolicy = {
  mimeTypes: [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "application/pdf",
  ],
  maxBytes: 20 * 1024 * 1024,
};

// Checks the bytes, not the client's claimed type: a .png that is really HTML
// must not be stored and served as an image
export function checkFile(content: Buffer, policy: FilePolicy): FileMimeType {
  if (content.length === 0) {
    throw new EmptyFileError();
  }
  if (content.length > policy.maxBytes) {
    throw new FileTooLargeError(policy.maxBytes);
  }
  const type = sniffType(content);
  if (!type || !policy.mimeTypes.includes(type)) {
    throw new UnsupportedFileTypeError(
      policy.mimeTypes.map((t) => FILE_EXTENSIONS[t]),
    );
  }
  return type;
}

function sniffType(b: Buffer): FileMimeType | null {
  if (
    b.length >= 8 &&
    b.subarray(0, 8).equals(
      Buffer.from([
        137,
        80,
        78,
        71,
        13,
        10,
        26,
        10,
      ]),
    )
  ) {
    return "image/png";
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    b.length >= 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (b.length >= 6 && /^GIF8[79]a$/.test(b.toString("ascii", 0, 6))) {
    return "image/gif";
  }
  if (b.length >= 5 && b.toString("ascii", 0, 5) === "%PDF-") {
    return "application/pdf";
  }
  return null;
}
