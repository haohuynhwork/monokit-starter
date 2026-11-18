import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import type { ConfigEntry } from "@/lib/types";
import { SettingsForm } from "@/routes/admin/_auth/settings/-lib/settings-form";

export const Route = createFileRoute("/admin/_auth/settings/")({
  loader: async ({ context }) => {
    // The api refuses non-admins too; this just explains it
    if (!isAdmin(context.user)) {
      return {
        admin: false,
        error: null,
        entries: [] as ConfigEntry[],
      };
    }
    const res = await api<ConfigEntry[]>("/configs");
    return res.status === "success" && res.data
      ? {
          admin: true,
          error: null,
          entries: res.data,
        }
      : {
          admin: true,
          error: res.message ?? "Couldn't load settings.",
          entries: [] as ConfigEntry[],
        };
  },
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: SettingsPage,
});

function SettingsPage() {
  const { admin, error, entries } = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Site-wide; money is in minor units (cents) of the currency.
        </p>
      </div>
      {!admin ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Only admins can change settings.
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <SettingsForm entries={entries} />
      )}
    </div>
  );
}
