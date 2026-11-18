import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/geo.js";

// The code is fixed. parentId: undefined keeps it, null moves to the top level.
export class UpdateRegionCommand extends Command<void> {
  constructor(
    readonly regionId: bigint,
    readonly input: {
      name?: string;
      position?: number;
      active?: boolean;
      parentId?: bigint | null;
    },
    readonly actor: Actor,
  ) {
    super();
  }
}
