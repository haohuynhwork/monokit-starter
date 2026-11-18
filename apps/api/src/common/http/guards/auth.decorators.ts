import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import type { Request } from "express";
import type { Actor } from "../../domain/actor.js";
import { requestOf } from "../request/request.js";

// Shared by every context's controllers; the guard lives in auth/http.

// A role's key: a built-in one or one an admin created (ideas/users "Roles")
export type Role = string;

// Set on the request by the auth guard from a verified access token
export interface AuthUser {
  id: bigint;
  role: Role;
  // What the role may do (users/domain/permissions.ts), resolved when the
  // request authenticates
  permissions: ReadonlySet<string>;
  // The device's session (auth's UserSession row)
  sessionId: bigint;
}

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

export const IS_PUBLIC = "auth:public";
export const PERMISSIONS_REQUIRED = "auth:permissions";

// Skips the global auth guard
export const Public = () => SetMetadata(IS_PUBLIC, true);

// The caller needs at least one of these permissions (keys in
// users/domain/permissions.ts)
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_REQUIRED, permissions);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => {
    const user = requestOf<AuthenticatedRequest>(ctx).user;
    if (!user) {
      throw new Error("CurrentUser used on a public route");
    }
    return user;
  },
);

// Who is acting, for audit: the signed-in user (null on a public route) plus
// the request's IP and user agent
export const CurrentActor = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Actor =>
    actorOf(requestOf<AuthenticatedRequest>(ctx)),
);

export function actorOf(req: AuthenticatedRequest): Actor {
  return {
    userId: req.user?.id ?? null,
    ip: req.ip || undefined,
    userAgent: req.headers?.["user-agent"]?.slice(0, 512) || undefined,
  };
}
