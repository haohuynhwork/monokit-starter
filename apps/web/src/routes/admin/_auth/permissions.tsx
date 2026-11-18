import { Badge } from "@packages/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@packages/ui/components/table";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import type { Permissions, RoleView } from "@/lib/types";
import { RolesPanel } from "./permissions/-lib/roles-panel";

// Any signed-in user may see the matrix; admins also manage the roles
export const Route = createFileRoute("/admin/_auth/permissions")({
  loader: async ({ context }) => {
    const [res, rolesRes] = await Promise.all([
      api<Permissions>("/users/permissions"),
      isAdmin(context.user) ? api<RoleView[]>("/roles") : Promise.resolve(null),
    ]);
    const roles =
      rolesRes?.status === "success" && rolesRes.data ? rolesRes.data : null;
    return res.status === "success" && res.data
      ? {
          error: null,
          data: res.data,
          roles,
        }
      : {
          error: res.message ?? "Couldn't load permissions.",
          data: null,
          roles,
        };
  },
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: PermissionsPage,
});

function PermissionsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Permissions</h1>
        <p className="text-sm text-muted-foreground">
          What each role may do. Change a user&apos;s role on the Users page.
        </p>
      </div>
      <RolesSection />
      <Matrix />
    </div>
  );
}

function RolesSection() {
  const { data, roles } = Route.useLoaderData();
  return data && roles ? (
    <RolesPanel roles={roles} permissions={data.permissions} />
  ) : null;
}

function Matrix() {
  const { error, data, roles: roleViews } = Route.useLoaderData();
  const label = (key: string) =>
    roleViews?.find((r) => r.key === key)?.name ??
    key.charAt(0).toUpperCase() + key.slice(1);
  const { user: me } = Route.useRouteContext();
  if (error || !data) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  const { roles, permissions } = data;
  // Keeps the api's order, one heading row per group
  const groups = [
    ...new Set(permissions.map((p) => p.group)),
  ];

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Permission</TableHead>
            {roles.map((role) => (
              <TableHead key={role} className="relative min-w-28 text-center">
                {label(role)}
                {role === me.role && (
                  <Badge
                    variant="secondary"
                    className="absolute top-1 right-1 h-4 px-1.5 text-[10px]"
                  >
                    You
                  </Badge>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => [
            <TableRow key={group} className="bg-muted/40 hover:bg-muted/40">
              <TableCell
                colSpan={roles.length + 1}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {group}
              </TableCell>
            </TableRow>,
            ...permissions
              .filter((p) => p.group === group)
              .map((p) => (
                <TableRow key={p.key}>
                  <TableCell>
                    <div>{p.label}</div>
                    <code className="text-xs text-muted-foreground">
                      {p.key}
                    </code>
                  </TableCell>
                  {roles.map((role) => (
                    <TableCell key={role} className="text-center">
                      {p.roles.includes(role) ? (
                        <Check
                          className="mx-auto size-4 text-primary"
                          aria-label={`${label(role)}: yes`}
                        />
                      ) : (
                        <Minus
                          className="mx-auto size-4 text-muted-foreground/50"
                          aria-label={`${label(role)}: no`}
                        />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              )),
          ])}
        </TableBody>
      </Table>
    </div>
  );
}
