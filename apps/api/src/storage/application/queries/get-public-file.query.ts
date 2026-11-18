import type { Readable } from "node:stream";
import { Query } from "@nestjs/cqrs";

export interface FileContent {
  filename: string;
  mimeType: string;
  sizeBytes: bigint;
  checksum: string;
  open(): Promise<Readable>;
}

// A public file of this backend by its public key, or by its storage key
// (the local backend's URLs); null when missing or private
export class GetPublicFileQuery extends Query<FileContent | null> {
  constructor(
    readonly by:
      | {
          key: string;
        }
      | {
          storageKey: string;
        },
  ) {
    super();
  }
}
