import { Command } from "@nestjs/cqrs";
import type { RequestMeta } from "../../../common/domain/actor.js";

export class SetConfigCommand extends Command<void> {
  constructor(
    readonly key: string,
    readonly value: unknown,
    readonly actorId: bigint,
    // Request context, for audit
    readonly meta?: RequestMeta,
  ) {
    super();
  }
}
