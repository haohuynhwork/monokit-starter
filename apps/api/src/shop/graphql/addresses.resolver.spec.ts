import type { INestApplication } from "@nestjs/common";
import { DeleteAddressCommand } from "../application/commands/delete-address.command.js";
import { SaveAddressCommand } from "../application/commands/save-address.command.js";
import type { AddressView } from "../application/queries/shop.view.js";
import { accountApp } from "./account.testing.js";
import { AddressesResolver } from "./addresses.resolver.js";

const fields = {
  label: null,
  recipientName: "Ann",
  phone: "0900",
  line1: "1 Main St",
  line2: null,
  city: "Hanoi",
  regionCode: null,
  region: null,
  postalCode: null,
  countryCode: "VN",
};
const address: AddressView = {
  ...fields,
  id: "9",
  isDefault: true,
};

describe("AddressesResolver", () => {
  let app: INestApplication;
  let gql: Awaited<ReturnType<typeof accountApp>>["gql"];
  const commands = vi.fn();
  const queries = vi.fn();

  beforeEach(async () => {
    commands.mockReset();
    queries.mockReset().mockResolvedValue([
      address,
    ]);
    ({ app, gql } = await accountApp(AddressesResolver, commands, queries));
  });

  afterEach(() => app.close());

  it("lists my addresses", async () => {
    const res = await gql("{ myAddresses { id city isDefault } }");
    expect(res.body).toEqual({
      data: {
        myAddresses: [
          {
            id: "9",
            city: "Hanoi",
            isDefault: true,
          },
        ],
      },
    });
  });

  it("creates an address and answers with it", async () => {
    commands.mockResolvedValue(9n);
    const res = await gql(
      'mutation { createMyAddress(input: { recipientName: "Ann", phone: "0900", line1: "1 Main St", city: "Hanoi", countryCode: "VN" }) { id } }',
    );
    expect(res.body.data.createMyAddress.id).toBe("9");
    expect(commands).toHaveBeenCalledWith(
      new SaveAddressCommand(7n, null, fields, undefined),
    );
  });

  it("deletes an address and answers true", async () => {
    const res = await gql('mutation { deleteMyAddress(id: "9") }');
    expect(res.body.data.deleteMyAddress).toBe(true);
    expect(commands).toHaveBeenCalledWith(new DeleteAddressCommand(7n, 9n));
  });

  it("validates the input", async () => {
    const res = await gql(
      'mutation { createMyAddress(input: { phone: "0900" }) { id } }',
    );
    expect(res.body.errors[0].extensions).toMatchObject({
      code: "validation_failed",
      status: 400,
    });
    expect(commands).not.toHaveBeenCalled();
  });
});
