import { Command } from "@nestjs/cqrs";
import type { Actor } from "../../domain/geo.js";

export class CreateRegionCommand extends Command<bigint> {
  constructor(
    readonly input: {
      countryCode: string;
      code: string;
      name: string;
      parentId: bigint | null;
      position?: number;
    },
    readonly actor: Actor,
  ) {
    super();
  }
}
