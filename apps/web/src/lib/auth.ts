import { api } from "./api";
import type { User } from "./types";

// The signed-in user, or null (no or expired session)
export async function fetchMe(): Promise<User | null> {
  const res = await api<User>("/users/me", {
    silent: true,
  });
  return res.status === "success" && res.data ? res.data : null;
}

// Staff pages (shop, geo, contact): admins and editors; the api enforces it
export const isStaff = (user: User) =>
  user.role === "admin" || user.role === "editor";

export const isAdmin = (user: User) => user.role === "admin";
