import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/geo.js";

// Hard delete, refused while an address or a subregion uses it
export class DeleteRegionCommand extends Command<void> {
  constructor(
    readonly regionId: bigint,
    readonly actor: Actor,
  ) {
    super();
  }
}
