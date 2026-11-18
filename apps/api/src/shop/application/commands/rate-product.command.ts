import { Command } from "@nestjs/cqrs";

// Sets (or replaces) the user's rating; needs a delivered order with it
export class RateProductCommand extends Command<void> {
  constructor(
    readonly userId: bigint,
    readonly productId: bigint,
    readonly stars: number,
    readonly body: string | null,
  ) {
    super();
  }
}
