import { Badge } from "@packages/ui/components/badge";
import { Button } from "@packages/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@packages/ui/components/table";
import { useRouter } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { Permissions, RoleView } from "@/lib/types";
import { deleteRole } from "./actions";
import { RoleDialog } from "./role-dialog";

// Admins: create, edit and delete roles. Built-in roles are read-only, and a
// role somebody has can't be deleted (the api refuses it too).
export function RolesPanel({
  roles,
  permissions,
}: {
  roles: RoleView[];
  permissions: Permissions["permissions"];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const remove = async (role: RoleView) => {
    if (!window.confirm(`Delete the role “${role.name}”?`)) {
      return;
    }
    const res = await deleteRole(role.id);
    setError(res.ok ? null : (res.message ?? "Could not delete the role."));
    if (res.ok) {
      await router.invalidate();
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Roles</h2>
        <RoleDialog permissions={permissions} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead className="w-20 text-right">Users</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {role.name}
                    {role.system && <Badge variant="secondary">Built-in</Badge>}
                  </div>
                  <code className="text-xs text-muted-foreground">
                    {role.key}
                  </code>
                  {role.description && (
                    <p className="text-xs text-muted-foreground">
                      {role.description}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-right">{role.users}</TableCell>
                <TableCell className="text-right">
                  {!role.system && (
                    <div className="flex justify-end gap-1">
                      <RoleDialog role={role} permissions={permissions} />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={role.users > 0}
                        title={
                          role.users > 0
                            ? "Move its users to another role first"
                            : undefined
                        }
                        onClick={() => remove(role)}
                      >
                        <Trash2 /> Delete
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
