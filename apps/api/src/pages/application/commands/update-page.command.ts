import { Command } from "@nestjs/cqrs";

export interface PageChanges {
  title?: string;
  description?: string | null;
  slug?: string | null;
  // Raw JSON, checked by the domain (ideas/pages "Settings")
  settings?: unknown;
  layoutId?: bigint | null;
  showInMenu?: boolean;
  menuOrder?: number;
}

export class UpdatePageCommand extends Command<void> {
  constructor(
    readonly pageId: bigint,
    readonly changes: PageChanges,
  ) {
    super();
  }
}
