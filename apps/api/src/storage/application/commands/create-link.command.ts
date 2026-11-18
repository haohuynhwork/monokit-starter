import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/asset.js";

// An external resource (e.g. an image hosted elsewhere); returns its id
export class CreateLinkCommand extends Command<bigint> {
  constructor(
    readonly parentId: bigint | null,
    readonly name: string,
    readonly url: string,
    readonly actor: Actor,
  ) {
    super();
  }
}
