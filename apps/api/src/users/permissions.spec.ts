import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { AuditEventsController } from "../audit/http/audit-events.controller.js";
import { PERMISSIONS_REQUIRED } from "../common/http/guards/auth.decorators.js";
import { ConfigsController } from "../configs/http/configs.controller.js";
import { ContactMessagesController } from "../contact/http/contact-messages.controller.js";
import { checkStaff as checkGeoStaff } from "../geo/domain/geo.js";
import { CurrenciesController } from "../geo/http/currencies.controller.js";
import { LocalesController } from "../geo/http/locales.controller.js";
import { RegionsController } from "../geo/http/regions.controller.js";
import { MailController } from "../mail/http/mail.controller.js";
import { PageLayoutsController } from "../pages/http/page-layouts.controller.js";
import { PagesController } from "../pages/http/pages.controller.js";
import { checkCanEdit, checkCanPublish, Post } from "../posts/domain/post.js";
import { PostsController } from "../posts/http/posts.controller.js";
import { DeleteRatingHandler } from "../shop/application/commands/delete-rating.handler.js";
import { checkCanEditProduct, checkStaff } from "../shop/domain/shop.js";
import { CategoriesController } from "../shop/http/categories.controller.js";
import { OrdersController } from "../shop/http/orders.controller.js";
import { ProductsController } from "../shop/http/products.controller.js";
import type { AssetNode } from "../storage/domain/asset.js";
import { checkCanManage } from "../storage/domain/asset-rules.js";
import { AssetsController } from "../storage/http/assets.controller.js";
import {
  builtInPermissions,
  PERMISSIONS,
  ROLE_ORDER,
} from "./domain/permissions.js";
import { RolesController } from "./http/roles.controller.js";
import { UsersController } from "./http/users.controller.js";

// The permissions page lists PERMISSIONS; the api enforces the rules in
// guards and domains. Each check below asks the real rule, once per built-in
// role, and once for a custom role holding only that permission (which must
// pass) and one holding nothing (which must not).

const ME = 1n;
const OTHER = 2n;
type Perms = ReadonlySet<string>;
const actor = (permissions: Perms) => ({
  id: ME,
  permissions,
});

const passes = (fn: () => unknown) => {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
};

type Ctor = abstract new (...args: never[]) => unknown;

// The guard's rule: no @RequirePermission lets any signed-in user in
function guardAllows(perms: Perms, cls: Ctor, method?: string): boolean {
  const target = method
    ? (cls.prototype as Record<string, object>)[method]
    : cls;
  const needed =
    (method && Reflect.getMetadata(PERMISSIONS_REQUIRED, target!)) ??
    Reflect.getMetadata(PERMISSIONS_REQUIRED, cls);
  return !needed || (needed as string[]).some((k) => perms.has(k));
}

const post = (authorId: bigint) =>
  Post.draft({
    title: "Hello",
    authorId,
    parentId: null,
  });
const asset = (createdById: bigint) =>
  ({
    id: 9n,
    createdById,
  }) as unknown as AssetNode;

const USER_ADMIN_ROUTES = [
  "list",
  "create",
  "show",
  "update",
  "changeRole",
  "changeStatus",
  "remove",
];

const CHECKS: Record<string, (p: Perms) => boolean | Promise<boolean>> = {
  "post:edit:own": (p) =>
    guardAllows(p, PostsController) &&
    passes(() => checkCanEdit(actor(p), post(ME))),
  "post:edit:any": (p) =>
    guardAllows(p, PostsController) &&
    passes(() => checkCanEdit(actor(p), post(OTHER))),
  "post:publish": (p) =>
    guardAllows(p, PostsController) &&
    passes(() => checkCanPublish(actor(p), post(ME))),
  "asset:upload": (p) =>
    guardAllows(p, AssetsController, "upload") &&
    passes(() => checkCanManage(actor(p), asset(ME))),
  "asset:manage:any": (p) =>
    guardAllows(p, AssetsController, "update") &&
    passes(() => checkCanManage(actor(p), asset(OTHER))),
  "shop:manage": (p) =>
    passes(() => checkStaff(actor(p))) &&
    [
      ProductsController,
      CategoriesController,
      OrdersController,
    ].every((c) => guardAllows(p, c)),
  "product:edit:any": (p) =>
    passes(() =>
      checkCanEditProduct(actor(p), {
        createdById: OTHER,
      }),
    ),
  "rating:delete:any": async (p) => {
    const handler = new DeleteRatingHandler({
      delete: async () => true,
    } as never);
    return handler
      .execute({
        target: {
          ratingId: 5n,
        },
        actor: actor(p),
      } as never)
      .then(
        () => true,
        () => false,
      );
  },
  "user:manage": (p) =>
    USER_ADMIN_ROUTES.every((m) => guardAllows(p, UsersController, m)) &&
    guardAllows(p, RolesController),
  "contact:manage": (p) => guardAllows(p, ContactMessagesController),
  "settings:manage": (p) =>
    [
      "list",
      "set",
      "reset",
    ].every((m) => guardAllows(p, ConfigsController, m)) &&
    guardAllows(p, MailController, "test"),
  "page:manage": (p) =>
    [
      PagesController,
      PageLayoutsController,
    ].every((c) => guardAllows(p, c)),
  "geo:manage": (p) =>
    passes(() => checkGeoStaff(actor(p))) &&
    [
      RegionsController,
      LocalesController,
      CurrenciesController,
    ].every((c) => guardAllows(p, c)),
  "audit:read": (p) => guardAllows(p, AuditEventsController, "list"),
};

// Permissions that only make sense next to another: publishing needs a way
// into the posts screens first
const WITH: Record<string, string[]> = {
  "post:publish": [
    "post:edit:own",
  ],
};

describe("permissions page matches the rules", () => {
  it("has a check for every permission, and no extras", () => {
    expect(Object.keys(CHECKS).sort()).toEqual(
      PERMISSIONS.map((p) => p.key).sort(),
    );
  });

  for (const p of PERMISSIONS) {
    for (const role of ROLE_ORDER) {
      const expected = p.roles.includes(role);
      it(`${p.key}: ${role} ${expected ? "may" : "may not"}`, async () => {
        expect(await CHECKS[p.key]!(builtInPermissions(role))).toBe(expected);
      });
    }

    it(`${p.key}: a custom role with only it may; with nothing may not`, async () => {
      expect(
        await CHECKS[p.key]!(
          new Set([
            p.key,
            ...(WITH[p.key] ?? []),
          ]),
        ),
      ).toBe(true);
      expect(await CHECKS[p.key]!(new Set())).toBe(false);
    });
  }
});
