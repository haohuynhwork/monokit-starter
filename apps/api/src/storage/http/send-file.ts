import type { Response } from "express";
import type { FileContent } from "../application/queries/get-public-file.query.js";

// Streams a stored file with safe headers
export async function sendFile(
  res: Response,
  file: FileContent,
  cacheControl: string,
): Promise<void> {
  res.set({
    "Content-Type": file.mimeType,
    "Content-Length": String(file.sizeBytes),
    // Shown in the browser; the name is kept for "save as"
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    "Cache-Control": cacheControl,
    ETag: `"${file.checksum}"`,
    "X-Content-Type-Options": "nosniff",
  });
  (await file.open()).pipe(res);
}
