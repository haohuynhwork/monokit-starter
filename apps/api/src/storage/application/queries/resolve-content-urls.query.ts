import { Query } from "@nestjs/cqrs";

// Rich-text bodies with their 'serve/<key>' references (relative, as
// stored) replaced by each public file's URL from the storage backend (a
// link's own URL), so clients get ready-to-use URLs. Same order as given;
// unknown or private ones fall back to the web app's '/serve/<key>' route
// (which 404s).
export class ResolveContentUrlsQuery extends Query<string[]> {
  constructor(readonly htmls: string[]) {
    super();
  }
}
