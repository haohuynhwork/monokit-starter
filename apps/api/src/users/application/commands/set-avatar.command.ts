import { Command } from "@nestjs/cqrs";

// Uploads an image and makes it the user's avatar; returns the asset id
export class SetAvatarCommand extends Command<bigint> {
  constructor(
    readonly userId: bigint,
    readonly content: Buffer,
    readonly filename: string,
  ) {
    super();
  }
}
