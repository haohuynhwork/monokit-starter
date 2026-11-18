import { Query } from "@nestjs/cqrs";
import type { SignedParams } from "../../domain/url-signer.js";
import type { FileContent } from "./get-public-file.query.js";

// A private file through a signed link (GET /assets/:id/content?...);
// null when the link is invalid, expired or no longer allowed
export class GetSignedFileQuery extends Query<FileContent | null> {
  constructor(
    readonly assetId: bigint,
    readonly params: Partial<SignedParams>,
  ) {
    super();
  }
}
