import { Logger } from "@nestjs/common";
import type { AuditEventRepository } from "../../domain/audit-event.repository.js";
import { RecordAuditEventCommand } from "./record-audit-event.command.js";
import { RecordAuditEventHandler } from "./record-audit-event.handler.js";

const command = new RecordAuditEventCommand({
  actor: {
    userId: 1n,
  },
  action: "configs.updated",
  entity: {
    type: "config",
    id: "site.name",
  },
  data: {
    key: "site.name",
  },
});

function repo(insert = vi.fn().mockResolvedValue(undefined)) {
  return {
    insert,
    deleteOlderThan: vi.fn(),
  } satisfies AuditEventRepository;
}

describe("RecordAuditEventHandler", () => {
  afterEach(() => vi.restoreAllMocks());

  it("inserts one row", async () => {
    const events = repo();
    await new RecordAuditEventHandler(events).execute(command);
    expect(events.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 1n,
        action: "configs.updated",
        entityType: "config",
        entityId: "site.name",
      }),
    );
  });

  it("logs and swallows a failed insert", async () => {
    const error = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    const events = repo(vi.fn().mockRejectedValue(new Error("db down")));
    await expect(
      new RecordAuditEventHandler(events).execute(command),
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
  });

  it("swallows an invalid entry too", async () => {
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const events = repo();
    await new RecordAuditEventHandler(events).execute(
      new RecordAuditEventCommand({
        actor: {
          userId: null,
        },
        action: "bad",
        entity: null,
      }),
    );
    expect(events.insert).not.toHaveBeenCalled();
  });
});
