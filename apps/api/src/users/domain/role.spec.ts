import { describe, expect, it } from "vitest";
import {
  InvalidRoleError,
  RoleInUseError,
  RoleKeyTakenError,
  SystemRoleError,
  UnknownPermissionError,
} from "./role.errors.js";
import { Role } from "./role.js";

const make = () =>
  Role.create({
    key: "Moderator",
    name: " Moderator ",
    permissions: [
      "post:publish",
      "post:publish",
    ],
  });

describe("Role", () => {
  it("normalises the key and name and dedupes permissions", () => {
    expect(make().snapshot()).toMatchObject({
      key: "moderator",
      name: "Moderator",
      system: false,
      permissions: [
        "post:publish",
      ],
    });
  });

  it("refuses bad keys, built-in keys and unknown permissions", () => {
    expect(() =>
      Role.create({
        key: "1x",
        name: "X",
        permissions: [],
      }),
    ).toThrow(InvalidRoleError);
    expect(() =>
      Role.create({
        key: "admin",
        name: "X",
        permissions: [],
      }),
    ).toThrow(RoleKeyTakenError);
    expect(() =>
      Role.create({
        key: "mod",
        name: "X",
        permissions: [
          "nope",
        ],
      }),
    ).toThrow(UnknownPermissionError);
  });

  it("updates a custom role, validating permissions", () => {
    const role = make();
    role.update({
      name: "Mods",
      permissions: [
        "contact:manage",
      ],
    });
    expect(role.snapshot()).toMatchObject({
      name: "Mods",
      permissions: [
        "contact:manage",
      ],
    });
    expect(() =>
      role.update({
        permissions: [
          "nope",
        ],
      }),
    ).toThrow(UnknownPermissionError);
  });

  it("deletes only when no user has it", () => {
    const role = make();
    expect(() => role.delete(2, "2026-11-18T00:00:00.000Z")).toThrow(
      RoleInUseError,
    );
    role.delete(0, "2026-11-18T00:00:00.000Z");
    expect(role.snapshot().deletedAt).toBe("2026-11-18T00:00:00.000Z");
  });

  it("never changes or deletes a built-in role", () => {
    const system = Role.restore({
      id: 1n,
      key: "admin",
      name: "Admin",
      description: null,
      system: true,
      permissions: [],
      deletedAt: null,
    });
    expect(() =>
      system.update({
        name: "X",
      }),
    ).toThrow(SystemRoleError);
    expect(() => system.delete(0, "2026-11-18T00:00:00.000Z")).toThrow(
      SystemRoleError,
    );
  });
});
