import {
  EmptyFileError,
  FileTooLargeError,
  UnsupportedFileTypeError,
} from "./asset.errors.js";
import { AVATAR_POLICY, checkFile } from "./file-policy.js";

const png = Buffer.from([
  137,
  80,
  78,
  71,
  13,
  10,
  26,
  10,
  0,
  0,
]);
const jpeg = Buffer.from([
  0xff,
  0xd8,
  0xff,
  0xe0,
  0,
  0,
]);
const webp = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.alloc(4),
  Buffer.from("WEBPVP8 "),
]);

describe("checkFile", () => {
  it("detects the type from the bytes", () => {
    expect(checkFile(png, AVATAR_POLICY)).toBe("image/png");
    expect(checkFile(jpeg, AVATAR_POLICY)).toBe("image/jpeg");
    expect(checkFile(webp, AVATAR_POLICY)).toBe("image/webp");
  });

  it("rejects files that only claim to be images", () => {
    const html = Buffer.from("<html><script>alert(1)</script></html>");
    expect(() => checkFile(html, AVATAR_POLICY)).toThrow(
      UnsupportedFileTypeError,
    );
  });

  it("rejects empty and oversized files", () => {
    expect(() => checkFile(Buffer.alloc(0), AVATAR_POLICY)).toThrow(
      EmptyFileError,
    );
    const big = Buffer.concat([
      png,
      Buffer.alloc(AVATAR_POLICY.maxBytes),
    ]);
    expect(() => checkFile(big, AVATAR_POLICY)).toThrow(FileTooLargeError);
  });
});
