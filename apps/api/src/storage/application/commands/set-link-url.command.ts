import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/asset.js";

// Points a link at another URL; its name and place stay
export class SetLinkUrlCommand extends Command<void> {
  constructor(
    readonly assetId: bigint,
    readonly url: string,
    readonly actor: Actor,
  ) {
    super();
  }
}
