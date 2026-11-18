import { Query } from "@nestjs/cqrs";

// A rich-text body as saving would store it (sanitized, own file URLs back
// to 'serve/<key>'), without storing anything: what the editor's preview shows
export class PreviewContentQuery extends Query<string> {
  constructor(readonly html: string) {
    super();
  }
}
