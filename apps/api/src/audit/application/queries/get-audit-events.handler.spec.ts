import type { QueryBus } from "@nestjs/cqrs";
import type { Db } from "@packages/nest";
import {
  DELETED_USER,
  decodeCursor,
  encodeCursor,
} from "./audit-event.view.js";
import { GetAuditEventsHandler } from "./get-audit-events.handler.js";
import { GetAuditEventsQuery } from "./get-audit-events.query.js";

const at = (n: number) => `2026-11-13T10:00:0${n}.000Z`;

function row(id: bigint, n: number, actorId: bigint | null) {
  return {
    id,
    occurredAt: at(n),
    actorId,
    action: "posts.published",
    entityType: "post",
    entityId: "1",
    data: {},
    ip: null,
    userAgent: null,
  };
}

// db.orm chain: every call returns the chain; all() returns the rows
function fakeDb(rows: unknown[]) {
  const calls: string[] = [];
  const chain: unknown = new Proxy(
    {},
    {
      get: (_, prop) => (arg: unknown) => {
        calls.push(String(prop));
        if (prop === "limit") {
          calls.push(`limit:${arg}`);
        }
        return prop === "all" ? Promise.resolve(rows) : chain;
      },
    },
  );
  return {
    db: {
      orm: {
        public: {
          AuditEvent: chain,
        },
      },
    } as unknown as Db,
    calls,
  };
}

const queries = {
  execute: vi.fn(async ({ userId }: { userId: bigint }) =>
    userId === 1n
      ? {
          displayName: "Paul",
        }
      : null,
  ),
} as unknown as QueryBus;

describe("GetAuditEventsHandler", () => {
  it("returns a page and a cursor when there are more rows", async () => {
    const { db, calls } = fakeDb([
      row(3n, 3, 1n),
      row(2n, 2, 9n),
      row(1n, 1, null),
    ]);
    const page = await new GetAuditEventsHandler(db, queries).execute(
      new GetAuditEventsQuery({}, 2, null),
    );
    // One extra row tells whether there is a next page
    expect(calls).toContain("limit:3");
    expect(page.items.map((i) => i.id)).toEqual([
      "3",
      "2",
    ]);
    expect(page.items[0]?.actor).toEqual({
      id: "1",
      name: "Paul",
    });
    expect(page.items[1]?.actor).toEqual({
      id: "9",
      name: DELETED_USER,
    });
    expect(decodeCursor(page.nextCursor ?? "")).toEqual({
      occurredAt: at(2),
      id: 2n,
    });
  });

  it("ends without a cursor on the last page", async () => {
    const { db } = fakeDb([
      row(1n, 1, null),
    ]);
    const page = await new GetAuditEventsHandler(db, queries).execute(
      new GetAuditEventsQuery({}, 2, {
        occurredAt: at(2),
        id: 2n,
      }),
    );
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.actor).toBeNull();
    expect(page.nextCursor).toBeNull();
  });
});

describe("audit cursor", () => {
  it("round-trips", () => {
    const cursor = {
      occurredAt: at(1),
      id: 42n,
    };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("rejects garbage", () => {
    expect(decodeCursor("nope")).toBeNull();
    expect(decodeCursor(Buffer.from("x|1").toString("base64url"))).toBeNull();
    expect(
      decodeCursor(Buffer.from(`${at(1)}|abc`).toString("base64url")),
    ).toBeNull();
  });
});
