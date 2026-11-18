import { Inject } from "@nestjs/common";
import { type IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import {
  HTML_SANITIZER,
  type HtmlSanitizer,
} from "../../../common/domain/html.js";
import { PreviewContentQuery } from "./preview-content.query.js";

@QueryHandler(PreviewContentQuery)
export class PreviewContentHandler
  implements IQueryHandler<PreviewContentQuery>
{
  constructor(
    @Inject(HTML_SANITIZER) private readonly sanitizer: HtmlSanitizer,
  ) {}

  execute({ html }: PreviewContentQuery): Promise<string> {
    return Promise.resolve(this.sanitizer.sanitize(html));
  }
}
