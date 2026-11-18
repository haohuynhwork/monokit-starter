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
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { EmptyRow, emptyText } from "@/components/empty-row";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { idParam, oneOf, textParam, toQuery } from "@/lib/search";

const PAGE_SIZE = 50;

// The actions recorded so far (ideas/audit/index.md)
const ACTIONS = [
  "auth.login",
  "auth.login_failed",
  "users.role_changed",
  "users.deleted",
  "posts.published",
  "orders.placed",
  "configs.updated",
] as const;

const ENTITY_TYPES = [
  "user",
  "post",
  "order",
  "config",
] as const;

// GET /audit-events items (AuditEventView in the api)
type AuditEvent = {
  id: string;
  occurredAt: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  data: Record<string, unknown>;
  actor: {
    id: string;
    name: string;
  } | null;
  ip: string | null;
  userAgent: string | null;
};

type AuditPage = {
  items: AuditEvent[];
  nextCursor: string | null;
};

type Search = {
  action?: (typeof ACTIONS)[number];
  entityType?: (typeof ENTITY_TYPES)[number];
  entityId?: string;
  actorId?: string;
  // yyyy-mm-dd, inclusive
  from?: string;
  to?: string;
};

const dateParam = (v: unknown) => {
  const s = textParam(v);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
};

const eventsPath = (s: Search, cursor?: string) =>
  `/audit-events${toQuery({
    limit: PAGE_SIZE,
    action: s.action,
    entityType: s.entityType,
    entityId: s.entityId,
    actorId: s.actorId,
    // Whole days in the viewer's time zone
    from: s.from ? new Date(`${s.from}T00:00:00`).toISOString() : undefined,
    to: s.to ? new Date(`${s.to}T23:59:59.999`).toISOString() : undefined,
    cursor,
  })}`;

// Admins only; the api refuses non-admins too
export const Route = createFileRoute("/admin/_auth/activity")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    action: oneOf(s.action, ACTIONS),
    entityType: oneOf(s.entityType, ENTITY_TYPES),
    entityId: textParam(s.entityId),
    actorId: idParam(s.actorId),
    from: dateParam(s.from),
    to: dateParam(s.to),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    if (!isAdmin(context.user)) {
      return {
        forbidden: true as const,
      };
    }
    const res = await api<AuditPage>(eventsPath(deps));
    return {
      forbidden: false as const,
      error:
        res.status !== "success"
          ? (res.message ?? "Could not load activity.")
          : null,
      page:
        res.status === "success" && res.data
          ? res.data
          : {
              items: [],
              nextCursor: null,
            },
    };
  },
  pendingComponent: () => (
    <p className="text-sm text-muted-foreground">Loading…</p>
  ),
  component: ActivityPage,
});

function ActivityPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
      <ActivityList />
    </div>
  );
}

function ActivityList() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({
    from: Route.fullPath,
  });
  if (data.forbidden) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Only admins can see the activity log.
      </p>
    );
  }

  // The URL holds the filters
  const filter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    void navigate({
      search: {
        action: oneOf(form.get("action"), ACTIONS),
        entityType: oneOf(form.get("entityType"), ENTITY_TYPES),
        entityId: textParam(form.get("entityId")),
        actorId: idParam(form.get("actorId")),
        from: dateParam(form.get("from")),
        to: dateParam(form.get("to")),
      },
    });
  };
  const key = JSON.stringify(search);
  const filtered = Object.values(search).some(Boolean);
  const input =
    "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm";

  return (
    <>
      <form
        noValidate
        onSubmit={filter}
        // Fresh inputs when the URL changes (e.g. back)
        key={key}
        className="flex flex-wrap gap-2"
      >
        <select
          name="action"
          defaultValue={search.action ?? ""}
          aria-label="Action"
          className={input}
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          name="entityType"
          defaultValue={search.entityType ?? ""}
          aria-label="Target type"
          className={input}
        >
          <option value="">Any target</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          name="entityId"
          defaultValue={search.entityId ?? ""}
          placeholder="Target id"
          aria-label="Target id"
          className={`${input} w-28`}
        />
        <input
          name="actorId"
          defaultValue={search.actorId ?? ""}
          placeholder="User id"
          aria-label="User id"
          inputMode="numeric"
          className={`${input} w-24`}
        />
        <input
          type="date"
          name="from"
          defaultValue={search.from ?? ""}
          aria-label="From"
          className={input}
        />
        <input
          type="date"
          name="to"
          defaultValue={search.to ?? ""}
          aria-label="To"
          className={input}
        />
        <Button type="submit" variant="outline" size="sm">
          Filter
        </Button>
      </form>

      {data.error ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {data.error}
        </p>
      ) : (
        // Remounts on new filters, dropping older pages already shown
        <EventsTable
          key={key}
          first={data.page}
          search={search}
          filtered={filtered}
        />
      )}
    </>
  );
}

function EventsTable({
  first,
  search,
  filtered,
}: {
  first: AuditPage;
  search: Search;
  filtered: boolean;
}) {
  const [items, setItems] = useState(first.items);
  const [cursor, setCursor] = useState(first.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showOlder = async () => {
    if (!cursor) {
      return;
    }
    setLoading(true);
    setError(null);
    const res = await api<AuditPage>(eventsPath(search, cursor));
    setLoading(false);
    if (res.status !== "success" || !res.data) {
      setError(res.message ?? "Could not load older activity.");
      return;
    }
    const { items: older, nextCursor } = res.data;
    setItems((prev) => [
      ...prev,
      ...older,
    ]);
    setCursor(nextCursor);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <EmptyRow
                colSpan={6}
                {...emptyText(
                  "activity",
                  filtered,
                  "Sign-ins, role changes, publishing and settings show up here.",
                )}
              />
            ) : (
              items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(e.occurredAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {e.actor ? (
                      <span title={`User ${e.actor.id}`}>{e.actor.name}</span>
                    ) : (
                      <span className="text-muted-foreground">System</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        e.action === "auth.login_failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {e.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.entityType ? `${e.entityType} #${e.entityId}` : "—"}
                  </TableCell>
                  <TableCell className="max-w-80 truncate font-mono text-xs">
                    {details(e.data)}
                  </TableCell>
                  <TableCell
                    className="whitespace-nowrap text-muted-foreground"
                    title={e.userAgent ?? undefined}
                  >
                    {e.ip ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {cursor && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={showOlder}
          >
            {loading ? "Loading…" : "Show older"}
          </Button>
        </div>
      )}
    </div>
  );
}

// { from: "author", to: "editor" } -> from: author, to: editor
function details(data: Record<string, unknown>): string {
  return Object.entries(data)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join(", ");
}
