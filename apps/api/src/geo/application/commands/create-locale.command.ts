import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/geo.js";

// The first locale becomes the default
export class CreateLocaleCommand extends Command<bigint> {
  constructor(
    readonly input: {
      code: string;
      name: string;
      nativeName?: string;
      rtl?: boolean;
      isDefault?: boolean;
      position?: number;
    },
    readonly actor: Actor,
  ) {
    super();
  }
}
