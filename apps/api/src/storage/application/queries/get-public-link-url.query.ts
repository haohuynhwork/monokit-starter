import { Query } from "@nestjs/cqrs";

// A public link's external URL by its key ('serve/<key>' in rich text);
// null when missing, private or not a link
export class GetPublicLinkUrlQuery extends Query<string | null> {
  constructor(readonly key: string) {
    super();
  }
}
