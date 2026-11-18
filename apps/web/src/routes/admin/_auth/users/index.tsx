import { Button } from "@packages/ui/components/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { emptyText } from "@/components/empty-row";
import { api, type User } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { oneOf, pageParam, textParam, toQuery } from "@/lib/search";
import type { RoleView } from "@/lib/types";
import { NewUserDialog } from "@/routes/admin/_auth/users/-lib/new-user-dialog";
import { UsersTable } from "@/routes/admin/_auth/users/-lib/users-table";

const PAGE_SIZE = 20;

const STATUSES = [
  "active",
  "disabled",
] as const;

// Admins only; the api refuses non-admins too
export const Route = createFileRoute("/admin/_auth/users/")({
  // Optional keys, so links and navigate can leave them out
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    q?: string;
    role?: string;
    status?: (typeof STATUSES)[number];
    page?: number;
  } => ({
    q: textParam(s.q),
    role: textParam(s.role),
    status: oneOf(s.status, STATUSES),
    page: pageParam(s.page),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    if (!isAdmin(context.user)) {
      return {
        forbidden: true as const,
      };
    }
    const page = deps.page ?? 1;
    const [res, rolesRes] = await Promise.all([
      api<User[]>(
        `/users${toQuery({
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          q: deps.q,
          role: deps.role,
          status: deps.status,
        })}`,
      ),
      api<RoleView[]>("/roles"),
    ]);
    const users = res.status === "success" && res.data ? res.data : [];
    // Paginated responses carry meta next to data
    const total =
      (
        res as {
          meta?: {
            total: number;
          };
        }
      ).meta?.total ?? users.length;
    return {
      forbidden: false as const,
      error:
        res.status !== "success"
          ? (res.message ?? "Could not load users.")
          : null,
      users,
      roles:
        rolesRes.status === "success" && rolesRes.data ? rolesRes.data : [],
      total,
    };
  },
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: UsersPage,
});

function UsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <UsersList />
    </div>
  );
}

function UsersList() {
  const data = Route.useLoaderData();
  const { q, role, status, page = 1 } = Route.useSearch();
  const { user: me } = Route.useRouteContext();
  const navigate = useNavigate({
    from: Route.fullPath,
  });
  if (data.forbidden) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Only admins can manage users.
      </p>
    );
  }
  const { users, roles, total, error } = data;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // The URL holds the filters; filtering starts again at page 1
  const filter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    void navigate({
      search: {
        q: textParam(form.get("q")),
        role: textParam(form.get("role")),
        status: oneOf(form.get("status"), STATUSES),
      },
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <form
          noValidate
          onSubmit={filter}
          // Fresh inputs when the URL changes (e.g. back)
          key={`${q}|${role}|${status}`}
          className="flex flex-1 flex-wrap gap-2"
        >
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name or email"
            className="h-8 min-w-60 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          />
          <select
            name="role"
            defaultValue={role ?? ""}
            aria-label="Role"
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.key} value={r.key}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status ?? ""}
            aria-label="Status"
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          <Button type="submit" variant="outline" size="sm">
            Filter
          </Button>
        </form>
        <NewUserDialog roles={roles} />
      </div>

      {error ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {error}
        </p>
      ) : (
        <UsersTable
          users={users}
          roles={roles}
          meId={me.id}
          empty={emptyText(
            "users",
            !!(q || role || status),
            "Add one with “New user”.",
          )}
        />
      )}

      {total > PAGE_SIZE && (
        <nav
          aria-label="Pages"
          className="flex items-center justify-end gap-2 text-sm text-muted-foreground"
        >
          <span>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(total, page * PAGE_SIZE)} of{" "}
            {total}
          </span>
          {page > 1 ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                to="."
                search={(prev) => ({
                  ...prev,
                  page: page - 1 > 1 ? page - 1 : undefined,
                })}
              >
                Previous
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          <span>
            {page} / {pages}
          </span>
          {page < pages ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                to="."
                search={(prev) => ({
                  ...prev,
                  page: page + 1,
                })}
              >
                Next
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </nav>
      )}
    </>
  );
}
