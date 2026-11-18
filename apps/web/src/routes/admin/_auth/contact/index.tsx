import { Button } from "@packages/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@packages/ui/components/table";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { EmptyRow } from "@/components/empty-row";
import { Empty, Pager } from "@/components/pager";
import { api } from "@/lib/api";
import { isStaff } from "@/lib/auth";
import { oneOf, pageParam, toQuery } from "@/lib/search";
import type { ContactMessage, ContactMessageStatus } from "@/lib/types";
import {
  STATUS_LABEL,
  STATUSES,
} from "@/routes/admin/_auth/contact/-lib/status";
import { MessageStatusBadge } from "@/routes/admin/_auth/contact/-lib/status-badge";

const PAGE_SIZE = 20;

// Staff only; the api checks the role too
export const Route = createFileRoute("/admin/_auth/contact/")({
  // Optional keys, so links can leave them out
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    status?: Exclude<ContactMessageStatus, "new"> | "all";
    page?: number;
  } => ({
    // "all" lists every status; no param means the new ones
    status: oneOf(s.status, [
      ...STATUSES.filter((x) => x !== "new"),
      "all" as const,
    ]),
    page: pageParam(s.page),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    if (!isStaff(context.user)) {
      return {
        forbidden: true as const,
      };
    }
    const status = deps.status ?? "new";
    const page = deps.page ?? 1;
    const [res, countsRes] = await Promise.all([
      api<ContactMessage[]>(
        `/contact/messages${toQuery({
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
          status: status === "all" ? undefined : status,
        })}`,
      ),
      api<Record<ContactMessageStatus, number>>("/contact/messages/counts"),
    ]);
    const messages = res.status === "success" && res.data ? res.data : [];
    const total =
      (
        res as {
          meta?: {
            total: number;
          };
        }
      ).meta?.total ?? messages.length;
    return {
      forbidden: false as const,
      error:
        res.status !== "success"
          ? (res.message ?? "Could not load messages.")
          : null,
      messages,
      total,
      counts: countsRes.status === "success" ? countsRes.data : undefined,
    };
  },
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <Button size="sm" asChild>
          <Link to="/admin/contact/new">
            <Plus /> New message
          </Link>
        </Button>
      </div>
      <Loaded />
    </div>
  );
}

function Loaded() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  if (data.forbidden) {
    return <Empty>Only admins and editors can read contact messages.</Empty>;
  }
  const { error, messages, total, counts } = data;
  const status = search.status ?? "new";
  const page = search.page ?? 1;

  return (
    <>
      <nav aria-label="Status" className="flex flex-wrap gap-1 text-sm">
        {[
          ...STATUSES,
          "all" as const,
        ].map((s) => (
          <Link
            key={s}
            to="/admin/contact"
            search={{
              status: s === "new" ? undefined : s,
            }}
            aria-current={s === status ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 ${
              s === status
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All" : STATUS_LABEL[s]}
            {s !== "all" && counts ? ` (${counts[s]})` : ""}
          </Link>
        ))}
      </nav>

      {error ? (
        <Empty>{error}</Empty>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.length === 0 && (
                <EmptyRow
                  colSpan={4}
                  title="No messages"
                  description="Messages sent through the site's contact forms appear here."
                />
              )}
              {messages.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="max-w-72">
                    <Link
                      to="/admin/contact/$id"
                      params={{
                        id: m.id,
                      }}
                      className="block truncate font-medium hover:underline"
                    >
                      {m.name ?? m.email ?? m.phone}
                    </Link>
                    {m.name && (m.email || m.phone) && (
                      <div className="truncate text-xs text-muted-foreground">
                        {m.email ?? m.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-80 truncate text-muted-foreground">
                    {m.subject ?? m.message?.slice(0, 80) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <MessageStatusBadge status={m.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <time
                      dateTime={m.createdAt}
                      title={new Date(m.createdAt).toLocaleString()}
                    >
                      {new Date(m.createdAt).toLocaleDateString()}
                    </time>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pager page={page} pageSize={PAGE_SIZE} total={total} />
    </>
  );
}
