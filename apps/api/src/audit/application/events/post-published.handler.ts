import { CommandBus, EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import type { AuditEntry } from "../../../common/domain/audit-entry.js";
import { PostPublishedEvent } from "../../../posts/domain/events/post-published.event.js";
import { RecordAuditEventCommand } from "../commands/record-audit-event.command.js";

export function postPublishedEntry(event: PostPublishedEvent): AuditEntry {
  return {
    actor: {
      userId: event.actorId,
      ...event.meta,
    },
    action: "posts.published",
    entity: {
      type: "post",
      id: String(event.postId),
    },
    data: {
      title: event.title,
      path: event.path,
    },
  };
}

// After the commit; best effort (RecordAuditEventCommand swallows failures)
@EventsHandler(PostPublishedEvent)
export class PostPublishedAuditor implements IEventHandler<PostPublishedEvent> {
  constructor(private readonly commands: CommandBus) {}

  handle(event: PostPublishedEvent): Promise<void> {
    return this.commands.execute(
      new RecordAuditEventCommand(postPublishedEntry(event)),
    );
  }
}
