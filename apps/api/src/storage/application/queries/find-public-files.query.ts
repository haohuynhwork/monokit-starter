import { Query } from "@nestjs/cqrs";

// Asset ids of public files of this backend by storage key (the part after
// /files/ in older bodies), then of public files and links by their public
// key ('serve/<key>' references), each in the given order. Unknown or private ones are left out.
export class FindPublicFilesByKeysQuery extends Query<bigint[]> {
  constructor(
    readonly storageKeys: string[],
    readonly assetKeys: string[] = [],
  ) {
    super();
  }
}
