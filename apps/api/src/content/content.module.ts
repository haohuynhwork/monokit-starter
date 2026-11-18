import { Module } from "@nestjs/common";
import { HTML_SANITIZER } from "../common/domain/html.js";
import { SanitizeHtmlSanitizer } from "../common/infrastructure/sanitize-html.sanitizer.js";
import { PreviewContentHandler } from "./application/queries/preview-content.handler.js";
import { ContentController } from "./http/content.controller.js";

@Module({
  controllers: [
    ContentController,
  ],
  providers: [
    {
      provide: HTML_SANITIZER,
      useClass: SanitizeHtmlSanitizer,
    },
    PreviewContentHandler,
  ],
})
export class ContentModule {}
