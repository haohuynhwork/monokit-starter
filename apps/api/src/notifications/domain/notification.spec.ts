import { fanOut, toSelf } from "./notification.js";

describe("fanOut", () => {
  const data = {
    postId: "5",
    title: "Hello",
    path: "hello",
  };

  it("notifies each recipient once, never the actor", () => {
    const rows = fanOut(
      [
        1n,
        2n,
        2n,
        3n,
      ],
      "post.published",
      data,
      2n,
    );
    expect(rows.map((r) => r.recipientId)).toEqual([
      1n,
      3n,
    ]);
    expect(rows[0]).toEqual({
      recipientId: 1n,
      type: "post.published",
      data,
      actorId: 2n,
    });
  });

  it("keeps everyone for system events", () => {
    expect(
      fanOut(
        [
          1n,
          2n,
        ],
        "post.published",
        data,
        null,
      ),
    ).toHaveLength(2);
  });
});

describe("toSelf", () => {
  it("sends to the recipient without an actor", () => {
    expect(toSelf(7n, "test", {})).toEqual({
      recipientId: 7n,
      type: "test",
      data: {},
      actorId: null,
    });
  });
});
