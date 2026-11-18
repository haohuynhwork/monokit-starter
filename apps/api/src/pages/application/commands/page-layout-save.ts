import type { CommandBus, QueryBus } from "@nestjs/cqrs";
import type { HtmlSanitizer } from "../../../common/domain/html.js";
import { sanitizeBlocks } from "../../domain/block-types.js";
import type { PageLayout } from "../../domain/page-layout.js";
import type { PageLayoutRepository } from "../../domain/page-layout.repository.js";
import { attachFiles, findFileIds } from "../page-files.js";

// Sidebar rich text cleaned, files checked, saved, files attached
export async function saveLayout(
  layout: PageLayout,
  deps: {
    layouts: PageLayoutRepository;
    sanitizer: HtmlSanitizer;
    commands: CommandBus;
    queries: QueryBus;
  },
): Promise<void> {
  layout.replaceSidebarBlocks(
    sanitizeBlocks(layout.sidebarBlocks(), (h) => deps.sanitizer.sanitize(h)),
  );
  const fileIds = await findFileIds(
    deps.queries,
    layout.fileKeys(),
    layout.assetKeys(),
  );
  await deps.layouts.save(layout);
  await attachFiles(deps.commands, "page_layout", layout.id!, fileIds);
}
