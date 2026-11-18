import { Command } from "@nestjs/cqrs";

// A visitor's message through a contactForm block on a live page; stored in
// the contact inbox and mailed (ideas/pages "Contact form", ideas/contact)
export class SendContactMessageCommand extends Command<void> {
  constructor(
    readonly pageId: bigint,
    readonly blockId: string,
    readonly fields: Record<string, unknown>,
    readonly ip: string | null,
    readonly userAgent: string | null,
  ) {
    super();
  }
}
