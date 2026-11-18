import { createFileRoute } from "@tanstack/react-router";
import { Empty, NotStaff } from "@/components/pager";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import type { Locale } from "@/lib/types";
import { LocaleList } from "@/routes/admin/_auth/locales/-lib/locale-list";

export const Route = createFileRoute("/admin/_auth/locales/")({
  loader: async ({ context }) => {
    if (!isStaff(context.user)) {
      return {
        staff: false,
        error: null,
        locales: [] as Locale[],
      };
    }
    const res = await api<Locale[]>("/locales");
    return res.status === "success" && res.data
      ? {
          staff: true,
          error: null,
          locales: res.data,
        }
      : {
          staff: true,
          error: res.message ?? "Could not load locales.",
          locales: [] as Locale[],
        };
  },
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: LocalesPage,
});

function LocalesPage() {
  const { staff, error, locales } = Route.useLoaderData();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Locales</h1>
        <p className="text-sm text-muted-foreground">
          The locales the site offers: a language plus region conventions for
          dates and numbers (vi-VN, en-US). The default is the fallback when a
          translation is missing.
        </p>
      </div>
      {!staff ? (
        <NotStaff />
      ) : error ? (
        <Empty>{error}</Empty>
      ) : (
        <LocaleList locales={locales} />
      )}
    </div>
  );
}
