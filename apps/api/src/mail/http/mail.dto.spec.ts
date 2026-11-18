import { sendTestEmailSchema } from "./mail.dto.js";

describe("sendTestEmailSchema", () => {
  it("sends synchronously unless asked to queue", () => {
    expect(sendTestEmailSchema.parse({})).toEqual({
      sync: true,
    });
    expect(
      sendTestEmailSchema.parse({
        sync: false,
      }),
    ).toEqual({
      sync: false,
    });
  });
});
