import { InvalidAuditActionError, toAuditRow } from "./audit-event.js";

describe("toAuditRow", () => {
  it("maps an entry to a row", () => {
    expect(
      toAuditRow({
        actor: {
          userId: 1n,
          ip: "10.0.0.1",
          userAgent: "ua",
        },
        action: "posts.published",
        entity: {
          type: "post",
          id: "7",
        },
        data: {
          title: "Paris",
        },
      }),
    ).toEqual({
      actorId: 1n,
      action: "posts.published",
      entityType: "post",
      entityId: "7",
      data: {
        title: "Paris",
      },
      ip: "10.0.0.1",
      userAgent: "ua",
    });
  });

  it("allows no target, no request and no data", () => {
    expect(
      toAuditRow({
        actor: {
          userId: null,
        },
        action: "auth.login_failed",
        entity: null,
      }),
    ).toMatchObject({
      actorId: null,
      entityType: null,
      entityId: null,
      data: {},
      ip: null,
      userAgent: null,
    });
  });

  it("cuts the user agent to the column size", () => {
    const row = toAuditRow({
      actor: {
        userId: null,
        userAgent: "x".repeat(600),
      },
      action: "auth.login",
      entity: null,
    });
    expect(row.userAgent).toHaveLength(512);
  });

  it("rejects a malformed action", () => {
    for (const action of [
      "published",
      "Posts.Published",
      `a.${"b".repeat(70)}`,
    ]) {
      expect(() =>
        toAuditRow({
          actor: {
            userId: null,
          },
          action,
          entity: null,
        }),
      ).toThrow(InvalidAuditActionError);
    }
  });
});
